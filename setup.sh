#!/bin/bash

sudo apt update -y
sudo apt install nodejs -y
npm i
sudo npm install -g pm2
sudo su
pm2 startup
pm2 start
pm2 save
