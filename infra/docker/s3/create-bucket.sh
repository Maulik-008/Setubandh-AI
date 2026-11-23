#!/bin/sh
# Create the local S3 bucket named in .env (S3_BUCKET). Idempotent: an existing bucket is fine.
set -eu
existing=$(echo "s3.bucket.list" | weed shell -master=s3:9333 2>/dev/null || true)
if printf '%s\n' "$existing" | grep -Eq "^[[:space:]]*${BUCKET}([[:space:]]|$)"; then
  echo "bucket ${BUCKET} ready (already existed)"
  exit 0
fi
echo "s3.bucket.create -name ${BUCKET}" | weed shell -master=s3:9333
echo "bucket ${BUCKET} ready"
