#!/bin/sh
# 최초로 Service 실행하는 Script

cd ./42s_checkin_server/
yarn build
npm run build-dev
NODEV_ENV=development pm2 start pm2-dev.json