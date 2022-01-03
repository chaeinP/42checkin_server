// noinspection DuplicatedCode
// noinspection DuplicatedCode
import dotenv from "dotenv";
import logger from '../modules/logger';
import mysql from "promise-mysql";
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

    const checkin = await mysql.createConnection(checkinParam);

    let ret, queue;
    queue = await checkin.query(`select * from \`usages\` order by created_at ASC;`);
    for await (const item of queue) {
        try {
            if (!item.checkin_at || !item.checkout_at) {
                logger.error('[INVALID]', JSON.stringify(item))
                continue;
            }
            let duration = (item.checkout_at.getTime() - item.checkin_at.getTime()) / 1000;
            if (Math.abs(duration - item.duration) > 0) {
                logger.error('[FIXED]  ', JSON.stringify(item))
                ret = await checkin.query(`update \`usages\` set \`duration\`=${duration} where \`_id\`=${item._id};`);
            }
        } catch (e) {
            logger.error(e);
            checkin.end();
            throw e;
        }
    }

    checkin.end();

    logger.debug('[END OF JOB] =========================================');
})();