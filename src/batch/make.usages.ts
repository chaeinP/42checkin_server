// noinspection DuplicatedCode
import logger from '../modules/logger';
import mysql from "promise-mysql";
import dotenv from "dotenv";
import path from "path";
import appRootPath from "app-root-path";

const config = dotenv.config({ path: path.join(appRootPath.path, `.env.${process.env.NODE_ENV}`) });

const getLocalDateString = (dt : Date) => {
    const offset = dt.getTimezoneOffset()
    const localDate = new Date(dt.getTime() - (offset*60*1000));
    return getDateString(localDate);
}

const getDateString = (dt : Date) => {
    return dt.toISOString().replace('T', ' ').split('.')[0];
}

// node --require ts-node/register src/batch/make.usages.ts
(async () => {
    logger.debug('[START] =========================================');
    const checkinParam = {
        host : process.env.DATABASE_HOST,
        user : process.env.DATABASE_USERNAME,
        password : process.env.DATABASE_PASSWORD,
        database : process.env.DATABASE_NAME,
        charset : 'utf8mb4'
    };

    const enterParam = {
        host : 'localhost',
        user : 'root',
        password : 'Daiso523!',
        database : 'enter_dev',
        charset : 'utf8mb4'
    };

    const checkin = await mysql.createConnection(checkinParam);
    const enter = await mysql.createConnection(enterParam);

    let ret, queue;

    queue = await enter.query(`select logId, logType, log.createdAt, cardCardId, userName from log left join user on  log.user_id=user._id order by log.createdAt ASC;`);
    // noinspection DuplicatedCode
    for await (const item of queue) {
        try {
            // 새로 생성
            if (item.logType.toLowerCase() === 'checkin') {
                // 새로 생성 전에 중복 체크
                let checkin_at = getLocalDateString(item.createdAt);
                ret = await checkin.query(`select * from \`usages\` where checkin_at='${checkin_at}' and login='${item.userName}' and card_no='${item.cardCardId}';`);

                // 동일한 데이터가 존재하면 SKIP
                if (ret.length > 0) {
                    logger.debug('[DUPLICATED]', JSON.stringify(ret), JSON.stringify(item));
                    continue;
                }
                let now = getLocalDateString(new Date())
                ret = await checkin.query(`INSERT INTO \`usages\` (\`login\`, \`checkin_at\`, \`card_no\`, \`created_at\`) VALUES ('${item.userName}', '${checkin_at}', '${item.cardCardId}', '${now}')`);
            } else if (item.logType.toLowerCase() === 'checkout' || item.logType.toLowerCase() === 'forcecheckout') {
                ret = await checkin.query(`select * from \`usages\` where card_no='${item.cardCardId}' and login='${item.userName}' and checkout_at is null;`);
                if (ret.length < 1) {
                    ret = await enter.query(`select * from \`log\` where cardCardId='${item.cardCardId}' and user_id='${item.user_id}' and logType='checkIn';`);
                    if (ret.length < 1) {
                        logger.debug('[NOT FOUND] ', JSON.stringify(item));
                    } else {
                        logger.debug('[DUPLICATED]', JSON.stringify(ret), JSON.stringify(item));
                    }
                    continue;
                }

                let checkout_at = getLocalDateString(item.createdAt);
                let duration = (item.createdAt.getTime() - ret[0].checkin_at.getTime()) / 1000;
                let actor = item.logType.toLowerCase() === 'forcecheckout' ? 'admin' : item.userName;
                ret = await checkin.query(`update \`usages\` set \`checkout_at\`='${checkout_at}', \`duration\`='${duration}', \`actor\`='${actor}' where \`_id\`=${ret[0]._id};`);
            }
        } catch (e) {
            logger.error(e);
            enter.end();
            checkin.end();
            throw e;
        }
    }

    queue = await checkin.query(`select * from history order by created_at ASC;`);
    for await (const item of queue) {
        try {
            // 새로 생성
            if (item.type.toLowerCase() === 'checkin') {
                // 새로 생성 전에 중복 체크
                let checkin_at = getLocalDateString(item.created_at);
                ret = await checkin.query(`select * from \`usages\` where checkin_at='${checkin_at}' and login='${item.login}' and card_no='${item.card_no}';`);

                // 동일한 데이터가 존재하면 SKIP
                if (ret.length > 0) {
                    logger.debug('[DUPLICATED]', JSON.stringify(ret), JSON.stringify(item));
                    continue;
                }

                let now = getLocalDateString(new Date())
                ret = await checkin.query(`INSERT INTO \`usages\` (\`login\`, \`checkin_at\`, \`card_no\`, \`created_at\`) VALUES ('${item.login}', '${checkin_at}', '${item.card_no}', '${now}')`);
            } else if (item.type.toLowerCase() === 'checkout' || item.type.toLowerCase() === 'forcecheckout') {
                ret = await checkin.query(`select * from \`usages\` where card_no='${item.card_no}' and login='${item.login}' and checkout_at is null;`);
                if (ret.length < 1) {
                    ret = await checkin.query(`select * from history where login='${item.login}' and card_no='${item.card_no}' and type='checkIn';`);
                    if (ret.length < 1) {
                        logger.debug('[NOT FOUND] ', JSON.stringify(item));
                    } else {
                        logger.debug('[DUPLICATED]', JSON.stringify(ret), JSON.stringify(item));
                    }
                    continue;
                }

                let checkout_at = getLocalDateString(item.created_at);
                let duration = (item.created_at.getTime() - ret[0].checkin_at.getTime()) / 1000;
                let actor = item.logType?.toLowerCase() === 'forcecheckout' ? 'admin' : item.login;
                ret = await checkin.query(`update \`usages\` set \`checkout_at\`='${checkout_at}', \`duration\`='${duration}', \`actor\`='${actor}' where \`_id\`=${ret[0]._id};`);
            }
        } catch (e) {
            logger.error(e);
            enter.end();
            checkin.end();
            throw e;
        }
    }

    enter.end();
    checkin.end();

    logger.debug('[END OF JOB] =========================================');
})();