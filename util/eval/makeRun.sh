#!/bin/bash

runalias=${1}
runid=${2}
cleanuptopic=${3}
cleanupid=${4}

tmpfil=$(mktemp)
if [ ${#} -eq 2 ]
then
  mysql total_recall -e "select topid,docid,min(id)as rank from requests_${runid} group by topid,docid order by topid,rank" | tail -n +2 > ${tmpfil}
  python makeTRECRun.py ${tmpfil} ${runalias}
  cat ${tmpfil} > ${runalias}
elif [ ${#} -eq 4 ]
then
  mysql total_recall -e "select topid,docid,min(id) as rank from requests_${runid} where topid != \"${cleanuptopic}\" group by topid,docid order by topid,rank"  | tail -n +2 > ${tmpfil}
  mysql total_recall -e "select topid,docid,min(id) as rank from requests_${cleanupid} where topid = \"${cleanuptopic}\" group by topid,docid order by topid,rank" | tail -n +2 >> ${tmpfil}
  python makeTRECRun.py ${tmpfil} ${runalias}
  cat ${tmpfil} > ${runalias}
#  python format_run ${tmpfil}
fi
rm ${tmpfil}
