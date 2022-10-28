#!/bin/bash

sudo apt update -y
sudo apt install nodejs -y
npm i
sed -i 's/API_KEY_GOES_HERE/YOURKEY/g' *.html
sudo npm install -g pm2
sudo su
pm2 startup
pm2 start
pm2 save
