import request from 'supertest';
import { app } from '../../../src/app';
import { describe, it, before } from 'mocha';
import { expect } from 'chai';
import { getTimeFormat } from '../../../src/modules/util';
import { Database } from '../../../src/models/database';
// @ts-ignore
import { getCookie } from '../mock';
import logger from '../../../src/modules/logger';
import { getCallerInfo } from '../../../src/modules/util';

let cookie = '';

describe(`[${getCallerInfo()}] config api test`, async () => {
	before(async () => {
        try {
            logger.init({console: false});
            await Database().authenticate();
            cookie = await getCookie();
        } catch(e) {
            console.log(e);
        }
	});

	describe((`[${getCallerInfo()}] 설정 테이블의 값을 조회`), () => {
		it('현재 환경의 이름값으로 값을 조회합니다.', async () => {
            const YYYYMMDD = getTimeFormat(new Date(), 'YYYY-MM-DD');
            const query = { date: YYYYMMDD };
			const res = await request(app).get(`/config`).query(query).set('Cookie', [cookie]);
			expect(res.body.gaepo).to.be.a('number')
			expect(res.body.begin_at).to.be.a('string')
            expect(res.body.end_at).to.be.a('string')
			expect(res.body.env).to.be.a('string')
		});
	});

	describe((`[${getCallerInfo()}] 설정 테이블의 값을 수정`), () => {
		it('특정 날짜를 선택하여 최대입장 인원수를 수정하고 다시 되돌립니다.', async () => {
            const YYYYMMDD = getTimeFormat(new Date(), 'YYYY-MM-DD');
            const query = { date: YYYYMMDD };
            const { body: { gaepo: oldGaepoCnt } } = await request(app).get(`/config`).query(query).set('Cookie', [cookie]);
            const maxCnt = 200;
            const body = {
                values: {
                    gaepo: maxCnt,
                },
                date: YYYYMMDD
            };
			const res = await request(app).put(`/config`).send(body).set('Cookie', [cookie]);
            expect(res.body.gaepo).eq(maxCnt);
            expect(res.body.seocho).to.be.a('number')
            expect(res.body.begin_at).to.be.a('string')
            expect(res.body.end_at).to.be.a('string')
			expect(res.body.env).to.be.a('string')
            body.values.gaepo = oldGaepoCnt;
			await request(app).put(`/config`).send(body).set('Cookie', [cookie]);
		});

		it('특정 날짜를 선택하여 입장가능 시간을 수정하고 다시 되돌립니다.', async () => {
            const YYYYMMDD = getTimeFormat(new Date(), 'YYYY-MM-DD');
            const query = { date: YYYYMMDD };
            const { body: { open_at: open_at, close_at: close_at } } = await request(app).get(`/config`).query(query).set('Cookie', [cookie]);
            const body = {
                values: {
                    open_at: '13:00',
                    close_at: '14:00'
                },
                date: YYYYMMDD
            };
			const res = await request(app).put(`/config`).send(body).set('Cookie', [cookie]);
            expect(res.body.open_at).eq('13:00');
            expect(res.body.close_at).eq('14:00');
			expect(res.body.env).to.be.a('string');
            body.values.open_at = open_at;
            body.values.close_at = close_at;
			await request(app).put(`/config`).send(body).set('Cookie', [cookie]);
		});
	});
});
