import request from 'supertest';
import { app } from '../../../src/app';
import { describe, it, before } from 'mocha';
import { expect } from 'chai';
import httpStatus from 'http-status';
import { CLUSTER_CODE } from '../../../src/modules/cluster';
import { sessionCookie } from '../env';
import { sequelize } from '../../../src/models';

describe('log api test', async () => {
	before((done) => {
        try {
            sequelize.authenticate().then(() => {
                done();
            })
            app.on('dbconnected', () => {
                done()
            });
        } catch(e) {
            console.log(e);
        }
	});

	const cardID = 9;
	describe((`${cardID}번 카드의 로그 조회`), () => {
		it(`객체로된 배열 형태의 데이터를 반환하는가?`, async () => {
			const res = await request(app).get(`/log/card/${cardID}`).query({page: 1, listSize: 50}).set('Cookie', [sessionCookie]);
			expect(res.body.list).to.an('array');
			expect(res.body.lastPage).to.an('number');
			if (res.body.list.length) {
				expect(res.body.list[0]).to.have.keys('user', 'card', 'logType', 'logId', 'createdAt', 'updatedAt', 'cardCardId', 'user_id')
			}
		});
	});

	describe((`모든 카드의 로그 조회`), () => {
		it('객체로된 배열 형태의 데이터를 반환하는가?', async () => {
			const res = await request(app).get(`/log/card/${cardID}`).query({page: 1, listSize: 50}).set('Cookie', [sessionCookie]);
			expect(res.body.list).to.an('array');
			expect(res.body.lastPage).to.an('number');
			expect(res.body.list[0]).to.have.keys('user', 'card', 'logType', 'logId', 'createdAt', 'updatedAt', 'cardCardId', 'user_id')
		});
	});

	describe((`특정 클러스터 모든 카드 로그 조회`), () => {
		it('객체로된 배열 형태의 데이터를 반환하는가?', async () => {
			const res = await request(app).get(`/log/${CLUSTER_CODE[CLUSTER_CODE.gaepo]}`).query({page: 1, listSize: 50}).set('Cookie', [sessionCookie]);
			expect(res.body.list).to.an('array');
			expect(res.body.lastPage).to.an('number');
			expect(res.body.list[0]).to.have.keys('user', 'card', 'logType', 'logId', 'createdAt', 'updatedAt', 'user_id', 'cardCardId')
			expect(res.body.list[0].card.type).to.equal(CLUSTER_CODE.gaepo)
		});
	});

	const userName = 'yurlee';
	describe((`[${userName}]가 사용한 카드 로그 조회`), () => {
		it(`객체로된 배열 형태의 데이터를 반환하는가? 내부에 닉네임이 존재하는가?`, async () => {
			const res = await request(app).get(`/log/user/${userName}`).query({page: 1, listSize: 50}).set('Cookie', [sessionCookie]);
			expect(res.body.list).to.an('array');
			expect(res.body.lastPage).to.an('number');
			expect(res.body.list[0]).to.have.keys('user', 'card', 'cardCardId', 'user_id', 'logType', 'logId', 'createdAt', 'updatedAt');
			expect(res.body.list[0].user.userName).to.equal(userName);
		});
	});

	describe((`클러스터별 미반납 카드 조회`), () => {
		it(`입력한 클러스터의 로그를 객체로된 배열 형태로 데이터를 반환하는가? 내부에 클러스터코드가 존재하는가?`, async () => {
			const res = await request(app).get(`/log/Checkin/${CLUSTER_CODE.gaepo}`).query({page: 1, listSize: 50}).set('Cookie', [sessionCookie]);
			expect(res.body.list).to.an('array');
			expect(res.body.lastPage).to.an('number');
			if (res.body.list[0]) {
				expect(res.body.list[0]).to.have.keys('user', 'card', 'logType', 'logId', 'createdAt', 'updatedAt', 'cardCardId', 'user_id');
				expect(res.body.list[0].card.type).to.equal(CLUSTER_CODE.gaepo)
			}
		});
	});

	describe((`클러스터별 모든 카드 로그 조회`), () => {
		it(`객체로된 배열 형태의 데이터를 반환하는가?`, async () => {
			const res = await request(app).get(`/log/allCard/${CLUSTER_CODE.gaepo}`).query({page: 1, listSize: 50}).set('Cookie', [sessionCookie]);
			expect(res.body.list).to.an('array');
			expect(res.body.lastPage).to.an('number');
			if (res.body.list[0]) {
				expect(res.body.list[0]).to.have.keys('user', 'card', 'logType', 'logId', 'createdAt', 'updatedAt', 'cardCardId', 'user_id');
				expect(res.body.list[0].card.type).to.equal(CLUSTER_CODE.gaepo)
			}
		});
	});

	describe((`존재하지 않는 클러스터의 미반납 카드 조회`), () => {
		it(`에러를 발생시키는가?`, async () => {
			const res = await request(app).get(`/log/Checkin/123`).query({page: 1, listSize: 50}).set('Cookie', [sessionCookie]);
			expect(res.body.code).to.equal(httpStatus.NOT_FOUND);
		});
	});

	describe((`존재하지 않는 클러스터의 모든 카드 로그 조회`), () => {
		it(`에러를 발생시키는가`, async () => {
			const res = await request(app).get(`/log/allCard/123`).query({page: 1, listSize: 50}).set('Cookie', [sessionCookie]);
			expect(res.body.code).to.equal(httpStatus.NOT_FOUND);
		});
	});
});