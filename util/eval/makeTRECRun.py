import sys

sim=10 ** 7
oldtopic="NULL"
rank=1
shots = dict()
trec=open(sys.argv[2]+".trec","a")
trectr=open(sys.argv[2]+".trectr","a")
with open(sys.argv[1],"r") as fil:
  for row in fil:
    row = row.split()
    if oldtopic == "NULL":
      oldtopic = row[1]
    elif oldtopic != row[0]:
      for key in ["70recall", "80recall","reasonable"]:
        if key in shots:
          print >> trectr, oldtopic, key, shots[key]
        # Do not implicitly call shots
      oldtopic=row[0]
      shots=dict()
      rank=1
    if row[1] in ["70recall","80recall","reasonable"]:
      shots[row[1]] = rank
    else:
      print >> trec, row[0],"Q0",row[1],rank,sim-rank,sys.argv[2]
      print >> trectr, row[0],"Q0",row[1],rank,sim-rank,sys.argv[2]
      rank += 1
for key in ["70recall", "80recall","reasonable"]:
  if key in shots:
    print >> trectr, oldtopic, key, shots[key]
    # Do not implicitly call shots
trec.close()
trectr.close()
