#!/bin/sh
sudo docker build -t 192.168.5.90:5000/frito/pass-api:latest .
sudo docker push 192.168.5.90:5000/frito/pass-api:latest
