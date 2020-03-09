#!/bin/sh
docker build -t 192.168.5.90:5000/frito/pass-api:latest .
docker push 192.168.5.90:5000/frito/pass-api:latest
