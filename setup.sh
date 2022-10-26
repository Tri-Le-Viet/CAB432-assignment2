#!/bin/bash

sudo apt update -y
sudo apt install nodejs -y
npm install
sed -i 's/API_KEY_GOES_HERE/YOURKEY/g' *.html
