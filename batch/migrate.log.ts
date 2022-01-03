// noinspection DuplicatedCode
import logger from 'src/modules/logger';
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

// // NODE_ENV=production node --require ts-node/register src/batch/migrate.log.ts
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
        host : process.env.DATABASE_HOST,
        user : process.env.DATABASE_USERNAME,
        password : process.env.DATABASE_PASSWORD,
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
            ret = await checkin.query(`INSERT INTO \`history\` (\`login\`, \`type\`, \`card_no\`, \`created_at\`) VALUES ('${item.userName}', '${item.logType}', '${item.cardCardId}', '${getLocalDateString(item.createdAt)}');`);
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