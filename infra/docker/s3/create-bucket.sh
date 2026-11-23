#!/bin/sh
# Create the local S3 bucket named in .env (S3_BUCKET). Safe to run again.
set -eu
echo "s3.bucket.create -name ${BUCKET}" | weed shell -master=s3:9333
echo "bucket ${BUCKET} ready"
