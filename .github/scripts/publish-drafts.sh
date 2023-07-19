#!/usr/bin/env bash

set -eux

CHANGES=NO
for DRAFT in _drafts/*
do
    BASE_FILENAME="${DRAFT#_drafts/}"

    if ! grep '^date: .\+$' "$DRAFT"
    then
        continue
    fi
    POST_DATE_RAW=$(grep '^date: .\+$' "$DRAFT" | awk '{for (i=2; i<NF; i++) printf $i " "; print $NF}')
    POST_DATE=$(date -d "$POST_DATE_RAW" "+%s")
    NOW=$(date "+%s")

    if [ "$NOW" -gt "$POST_DATE" ]
    then
        CHANGES=YES
        POST_DATE_DATE=$(echo "$POST_DATE_RAW" | awk '{print $1}')
        git mv "$DRAFT" "_posts/${POST_DATE_DATE}-${BASE_FILENAME}"
    fi
done
if [ "$CHANGES" = "YES" ]
then
    git config user.name "GitHub Actions"
    git config user.email "noreply@github.com"
    git commit -m "Publish scheduled posts"
fi
