#!/bin/bash
while read line
do
  bash makeRun.sh ${line}
done < ${1}
