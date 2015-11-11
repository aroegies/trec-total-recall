import argparse
import sys
import math
import itertools

# Would be preferable to use numpy and scipy but  we won't to reduce
# dependencies.
# Although, who doesn't have numpy and scipy?!
#import numpy as np
#import scipy as sp
#import scipy.stats

class Run:
  def __init__ (self, runfile):
    self.run = dict()
    self.shots = dict()
    for line in runfile:
      #topid Q0 docid rank sim runid
      line = line.split()
      topid = line[0]
      docid = line[2]
      if line[1] in ["70recall","80recall","reasonable"]:
        if topid not in self.shots:
          self.shots[topid]=dict()
        self.shots[topid][line[1]]=int(docid)
      if topid not in self.run:
        self.run[topid] = [docid]
      else:
        self.run[topid].append(docid)


# Keep a map of (topid,docid) -> facet
facet_map = dict()
# Keep track of prevalence of each facet for each topic
facet_totals = dict()
# Keep track of general prevalence of each topic
general_totals = dict()

def load_facets(facet_file):
  with open(facet_file,'r') as fil:
    for line in fil:
      topid,docid,facet=line.split()
      # Set up dictionaries for this topic
      if topid not in facet_map:
        facet_map[topid] = dict()
        facet_totals[topid] = dict()
      # Only track relevant facets
      if int(facet) <= 0:
        continue

      # Set current count of relevant documents (binary)
      # to 0 
      if topid not in general_totals:
          general_totals[topid] = 0

      if docid in facet_map[topid]:
        facet_map[topid][docid].add(facet)
      else:
        facet_map[topid][docid]=set([facet])
        # Only count the first time this document
        # appears towards binary relevance
        general_totals[topid] += 1
      # Keep track of number of documents relevant
      # to a facet
      if facet not in facet_totals[topid]:
        facet_totals[topid][facet] = 1
      else:
        facet_totals[topid][facet] += 1

def std_dev(lst, mean):
  return math.sqrt((1/float(len(lst)-1)) * math.fsum((x - mean)**2 for x in lst))


def compute_recall_effort(run,out_prefix,binary=False):
  if binary:
    out_prefix += ".binary.recalleffort"
    with open(out_prefix,'w') as outfil:
      for topid in sorted(run.run.keys()):
        rel = 0
        effort = 0
        cutoff = 0.05
        for docid in run.run[topid]:
          effort += 1
          if docid in facet_map[topid]:
            rel += 1
            recall = rel / float(general_totals[topid])
            while recall + 0.000001 > cutoff:
              print >> outfil, topid, general_totals[topid], cutoff, "%.04f" % recall, effort
              cutoff += 0.05
              if cutoff > 1.2:
                break
            if cutoff > 1.2:
              break
        print >> outfil, topid, general_totals[topid], "%.04f" % recall , "%.04f" % recall, effort
          
  else:
    out_prefix += '.facet.recalleffort'
    with open(out_prefix,'w') as outfil:
      for topid in sorted(run.run.keys()):
        facet_rels = dict((x,0) for x in facet_totals[topid].keys())
        rel = 0
        effort = 0
        cutoff = 0.05
        for docid in run.run[topid]:
          effort += 1
          if docid in facet_map[topid]:
            rel += 1
            for facet in facet_map[topid][docid]:
              facet_rels[facet] += 1
            recall = rel / float(general_totals[topid])
            while recall + 0.000001 > cutoff:
              facet_recall = [ y/float(facet_totals[topid][x]) for x,y in facet_rels.items()]
              facet_mean = math.fsum(facet_recall)/ len(facet_recall)
              # np_mean = np.mean(np.array(facet_recall))
              #print np_mean, facet_mean
              facet_stdev = std_dev(facet_recall,facet_mean)
              #np_stdev = np.std(np.array(facet_recall),ddof=1)
              #print np_stdev, facet_stdev
              facet_stderr = facet_stdev / math.sqrt(len(facet_recall))
              #sp_stderr = sp.stats.sem(np.array(facet_recall),ddof=1)
              #print sp_stderr, facet_stderr
              print >> outfil, topid, general_totals[topid], cutoff, "%.04f" % recall, effort, 
              print >> outfil,  "%.04f" % facet_mean, "%.04f" % max(0.0,(facet_mean - 1.96*facet_stderr)), "%.04f" % min(1.0,(facet_mean + 1.96*facet_stderr))
              cutoff += 0.05
              if cutoff > 1.2:
                break
            if cutoff > 1.2:
              break
        facet_recall = [ y/float(facet_totals[topid][x]) for x,y in facet_rels.items()]
        facet_mean = math.fsum(facet_recall)/ len(facet_recall)
        facet_stdev = std_dev(facet_recall,facet_mean)
        facet_stderr = facet_stdev / math.sqrt(len(facet_recall))
        print >> outfil, topid, general_totals[topid], cutoff, "%.04f" % recall, effort, 
        print >> outfil,  "%.04f" % facet_mean, "%.04f" % max(0.0,(facet_mean - 1.96*facet_stderr)), "%.04f" % min(1.0,(facet_mean + 1.96*facet_stderr))
   

def compute_aRpb(run,out_prefix,binary=True):
  if binary:
    out_prefix += '.aRpb'
    with open(out_prefix,'w') as outfil:
      for topid in sorted(run.run.keys()):
        for a,b in itertools.product([1,2,4],[0,100,1000]):
          cutoff = a*general_totals[topid] + b
          rel = len(filter(lambda x: x in facet_map[topid],run.run[topid][:cutoff]))
          recall = rel / float(general_totals[topid])
          print >> outfil,topid,cutoff,a,b, "%.04f" % recall
  else:
    out_prefix += '.facet.aRpb'
    with open(out_prefix,'w') as outfil:
      for topid in sorted(run.run.keys()):
        for a,b in itertools.product([1,2,4],[0,100,1000]):
          cutoff = a*general_totals[topid] + b
          rel = len(filter(lambda x: x in facet_map[topid],run.run[topid][:cutoff]))
          #facet_rels = dict ((x,0) for x in facet_totals[topid].keys())
          facet_recall = [ len(filter(lambda x: x in facet_map[topid] and facet in facet_map[topid][x],run.run[topid][:cutoff])) / float(facet_totals[topid][facet]) for facet in facet_totals[topid].keys()]
          #facet_recall = [ y/float(facet_totals[topid][x]) for x,y in facet_rels.items()]
          facet_mean = math.fsum(facet_recall)/ len(facet_recall)
          facet_stdev = std_dev(facet_recall,facet_mean)
          facet_stderr = facet_stdev / math.sqrt(len(facet_recall))
          recall = rel / float(general_totals[topid])
          print >> outfil,topid,cutoff,a,b, "%.04f" % recall,
          print >> outfil,  "%.04f" % facet_mean, "%.04f" % max(0.0,(facet_mean - 1.96*facet_stderr)), "%.04f" % min(1.0,(facet_mean + 1.96*facet_stderr))

def compute_precision_recall(run,out_prefix):
    out_prefix += ".precisionrecall"
    with open(out_prefix,'w') as outfil:
      for topid in sorted(run.run.keys()):
        rel = 0
        effort = 0
        cutoff = 0.05
        for docid in run.run[topid]:
          effort += 1
          if docid in facet_map[topid]:
            rel += 1
            recall = rel / float(general_totals[topid])
            precision = rel / float(effort)
            f1 = 2 * (recall * precision) / (recall + precision)
            while recall + 0.000001 > cutoff:
              print >> outfil, topid, general_totals[topid], cutoff, "%.04f" % recall, effort,
              print >> outfil, "%.04f" % min(1.0,precision), "%.04f" % min(1.0,f1)
              cutoff += 0.05
              if cutoff > 1.2:
                break
            if cutoff > 1.2:
              break
        recall = rel / float(general_totals[topid]) + 0.00001
        precision = (rel / float(effort)) + 0.00001
        f1 = 2 * (recall * precision) / (recall + precision)
        print >> outfil, topid, general_totals[topid],  "%.04f" % recall,  "%.04f" % recall, effort,
        print >> outfil, "%.04f" % min(1.0,precision), "%.04f" % min(1.0,f1)
 
        if run.shots and run.shots[topid]:
          for key in run.shots[topid].keys():
            cutoff = run.shots[topid][key]
            rel = len(filter(lambda x : x in facet_map[topid],run.run[topid][:cutoff]))
            recall = rel / float(general_totals[topid])
            precision = rel / float(cutoff)
            f1 = 2 * (recall * precision) / (recall + precision)
            print >> outfil, topid, general_totals[topid], key, "%.04f" % recall,cutoff, "%.04f" % min(1.0,precision), "%.04f" % min(1.0,f1)

def compute_avg_precision_recall(run,out_prefix):
    out_prefix += ".avg.precisionrecall"
    with open(out_prefix,'w') as outfil:
      effort = dict([ (topic,0) for topic in run.run.keys()])
      rel = dict([ (topic,0) for topic in run.run.keys()])
      done = dict([ (topic,False) for topic in run.run.keys()])
      n = len(run.run.keys())
      print n
      cutoff = 0.05 
      while not all(done.values()) :
        recall = 0.0
        precision = 0.0
        f1 = 0.0
        for topid in run.run.keys():
          if effort[topid] >= len(run.run[topid]):
            done[topid] = True
          else:
            docid = run.run[topid][effort[topid]]
            effort[topid] += 1
            if docid in facet_map[topid]:
              rel[topid] += 1
          r = rel[topid] / float(general_totals[topid])
          p = 0.000001 + (rel[topid] / float(effort[topid]))
          recall += r
          precision += p
          f1 += 2 * (r * p) / (r + p)
        avg_effort = sum(effort.values()) / n
        avg_recall = recall / n 
        avg_precision = precision / n
        avg_f1 = f1 / n
        avg_rel = sum(general_totals.values()) / n 
        while avg_recall + 0.000001 > cutoff:
          print >> outfil, "AVG", avg_rel, cutoff, "%.04f" % avg_recall, avg_effort,
          print >> outfil, "%.04f" % min(1.0,avg_precision), "%.04f" % min(1.0,avg_f1)
          cutoff += 0.05
          if cutoff > 1.2:
            break
          if cutoff > 1.2:
            break
      avg_effort = sum(effort.values()) / n
      recall = 0.0
      precision = 0.0
      f1 = 0.0
      for topid in run.run.keys():
        r = rel[topid] / float(general_totals[topid])
        p = 0.000001 + (rel[topid] / float(effort[topid]))
        recall += r
        precision += p
        f1 += 2 * (r * p) / (r + p)
      avg_recall = recall / n 
      avg_precision = precision / n
      avg_f1 = f1 / n
      avg_rel = sum(general_totals.values()) / n 
      print >> outfil, "AVG", avg_rel, "%.04f" % avg_recall, "%.04f" % avg_recall, avg_effort,
      print >> outfil, "%.04f" % min(1.0,avg_precision), "%.04f" % min(1.0,avg_f1)
        #recall = rel / float(general_totals[topid]) + 0.00001
        #precision = (rel / float(effort)) + 0.00001
        #f1 = 2 * (recall * precision) / (recall + precision)
        ##print >> outfil, topid, general_totals[topid],  "%.04f" % recall,  "%.04f" % recall, effort,
        #print >> outfil, "%.04f" % min(1.0,precision), "%.04f" % min(1.0,f1)
 
if __name__ == "__main__":
  parser = argparse.ArgumentParser(description="TREC 2015 Total Recall track evaluation toolkit")  
  parser.add_argument('-i','--infile',help="Run file to be evaluated",type=str)
  parser.add_argument('-o','--outfile',help="Prefix of the file to write output to (suffixes are used for different measures.",type=str,default="total_recall_run")
  parser.add_argument('-f','--facets',help="A Total Recall track facets file. ",type=str)
  parser.add_argument('-q','--qrels',help="A TREC qrels file",type=str)
  args=parser.parse_args()

  if args.infile:
    infile=open(args.infile,'r')
  else:
    infile=sys.stdin

  run = Run(infile)

  if args.facets:
    load_facets(args.facets)
  elif args.qrels:
    load_facets(args.qrels)
  else:
    print >> sys.stderr, "Error! A facet or qrels file must be supplied!"
    sys.exit(1)

  #compute_recall_effort(run,args.outfile,binary=True)
  #compute_precision_recall(run,args.outfile)
  #compute_avg_precision_recall(run,args.outfile)
  #compute_aRpb(run,args.outfile)
  compute_aRpb(run,args.outfile,binary=False)
  #compute_recall_effort(run,args.outfile)
