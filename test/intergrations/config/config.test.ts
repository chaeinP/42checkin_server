import request from 'supertest';
import { app } from '../../../src/app';
import { describe, it, before } from 'mocha';
import { expect } from 'chai';
import { getTimeFormat } from '../../../src/modules/util';
import { Sequelize } from '../../../src/models/database';
// @ts-ignore
import { getCookie } from '../env';
import logger from '../../../src/modules/logger';

let cookie = '';

describe('config api test', async () => {
	before(async () => {
        try {
            logger.init({console: false});
            await Sequelize().authenticate();
            cookie = await getCookie();
        } catch(e) {
            console.log(e);
            logger.error(e);
            process.exit(1);
        }
	});

	describe((`설정 테이블의 값을 조회`), () => {
		it('현재 환경의 이름값으로 값을 조회합니다.', async () => {
            const today = getTimeFormat(new Date(), 'YYYY-MM-DD');
            const query = { date: today };
			const res = await request(app).get(`/config`).query(query).set('Cookie', [cookie]);

			expect(res.body.gaepo).to.be.a('number', `gaepo`)
			expect(res.body.begin_at).to.be.a('string', `begin_at`)
            expect(res.body.end_at).to.be.a('string', `end_at`)
			expect(res.body.env).to.be.a('string')
		});
	});

	describe((`설정 테이블의 값을 수정`), () => {
		it('특정 날짜를 선택하여 최대입장 인원수를 수정하고 다시 되돌립니다.', async () => {
            const today = getTimeFormat(new Date(), 'YYYY-MM-DD');
            const query = { date: today };
            const { body: { gaepo: oldGaepoCnt } } = await request(app).get(`/config`).query(query).set('Cookie', [cookie]);
            const maxCnt = 200;
            const body = {
                values: {
                    gaepo: maxCnt,
                },
                date: today
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
            const today = getTimeFormat(new Date(), 'YYYY-MM-DD');
            const query = { date: today };
            const { body: { open_at: _open_at } } = await request(app).get(`/config`).query(query).set('Cookie', [cookie]);
            const date = '09:00';
            const body = {
                values: {
                    open_at: date,
                },
                date: today
            };
			const res = await request(app).put(`/config`).send(body).set('Cookie', [cookie]);
            expect(res.body.open_at).eq('09:00');
            expect(res.body.seocho).to.be.a('number')
            expect(res.body.open_at).to.be.a('string')
			expect(res.body.env).to.be.a('string')
            body.values.open_at = _open_at;
			await request(app).put(`/config`).send(body).set('Cookie', [cookie]);
		});
	});
});
