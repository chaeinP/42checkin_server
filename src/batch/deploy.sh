#!/bin/sh
# Jenkins에서 패치 후 Process Reload하는 script

REPOSITORY=/home/yurlee/git/42s_checkin_server

cd $REPOSITORY
git pull origin develop
yarn install

echo "> 프로젝트 Build 시작"
npm run build-dev
echo "> 프로젝트 Build 완료"
pm2 reload 42checkin-dev
echo "> pm2 reload 완료"

pm2 list