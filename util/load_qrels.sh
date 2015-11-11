#!/bin/bash

for file in $1/*.csv
do
  fn=$(basename ${file} .csv)
  echo "create table judgments_${fn} (docid text, topid text, rel integer, index (docid(40),topid(40),rel));"
  echo "load data local infile '${file}' into table judgments_${fn} fields terminated by ',';"
done | mysql total_recall --local-infile

