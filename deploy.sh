#!/bin/sh

cd `dirname $0`

gcloud app deploy app.yaml --project jemyrazem

