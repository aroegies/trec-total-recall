#/bin/bash

echo "load data local infile '${1}' into table topics fields terminated by ',' optionally enclosed by '\"'" | mysql total_recall --local-infile
