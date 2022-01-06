import request from 'supertest';
import { app } from '../../../src/app';
import { describe, it, before } from 'mocha';
import { expect } from 'chai';
import httpStatus from 'http-status';
import { Database } from '../../../src/models/database';
// @ts-ignore
import {getCookie, getUserId, getUserLoginName} from '../mock';
import { getCallerInfo } from '../../../src/modules/util';

let cookie = '';
const userStatusKeys = ['login', 'card', 'state', 'log_id', 'checkin_at', 'checkout_at', 'profile_image_url'];
const clusterKeys = ['gaepo', 'seocho'];

describe(`[${getCallerInfo()}] user api test`, async () => {
    before(async () => {
        try {
            await Database().authenticate();
            cookie = await getCookie();
            await request(app).post(`/user/checkOut`).set('Cookie', [cookie]);
        } catch (e) {
            console.log(e);
        }
    });

	describe(`[${getCallerInfo()}] 유저 상태 조회`, () => {
		it('유저의 상태를 나타내는 값들이 반환되는가?', async () => {
			const res = await request(app).get(`/user/status`).set('Cookie', [ cookie ]);
			expect(res.body.user.login).to.equal(getUserLoginName());
			expect(res.body.user).to.have.all.keys(userStatusKeys);
			expect(res.body.cluster).to.have.all.keys(clusterKeys);
			expect(res.body.isAdmin).to.be.a('boolean');
		});
	});

	describe(`[${getCallerInfo()}] 클러스터별 유저 수 조회`, () => {
		it('클러스터별 유저 입장수가 반환되는가?', async () => {
            const res = await request(app).get(`/user/using`).set('Cookie', [cookie]);
			expect(res.body).to.have.all.keys(clusterKeys)
			expect(res.body.seocho).to.a('number');
			expect(res.body.gaepo).to.a('number');
		});
	});

	const cardID = 9;
	const userID = await getUserId();
	describe(`[${getCallerInfo()}] ${cardID}번 카드 체크인`, () => {
		it('체크인이 정상적으로 작동하는가?', async (done) => {
			const res = await request(app).post(`/user/checkIn/${cardID}`).set('Cookie', [ cookie ]);
			expect(res.body.result).to.equal(true);
		});
	});

	describe(`[${getCallerInfo()}] ${cardID}번 카드 중복 체크인`, () => {
		it('중복 체크인시 에러가 발생하는가?', async (done) => {
			const res = await request(app).post(`/user/checkIn/${cardID}`).set('Cookie', [ cookie ]);
			expect(res.status).to.equal(httpStatus.CONFLICT);
			expect(res.body.code).to.equal(httpStatus.CONFLICT);
		});
	});

	describe(`[${getCallerInfo()}] 체크인 후 유저 상태 조회`, () => {
		it('유저의 카드 상태가 바뀌었는가?', async () => {
			const res = await request(app).get(`/user/status`).set('Cookie', [ cookie ]);
			expect(res.body.user.login).to.equal(getUserLoginName());
			expect(res.body.user.card).to.equal(cardID);
		});
	});

	describe(`[${getCallerInfo()}] 유저 체크아웃`, () => {
		it('체크아웃이 정상적으로 작동하는가?', async (done) => {
			const res = await request(app).post(`/user/checkOut`).set('Cookie', [ cookie ]);
			expect(res.body.result).to.equal(true);
		});
	});

	describe(`[${getCallerInfo()}] 다음 테스트를 위해 ${cardID}번 카드로 체크인`, () => {
		it('체크인이 정상적으로 작동하는가?', async (done) => {
			const res = await request(app).post(`/user/checkIn/${cardID}`).set('Cookie', [ cookie ]);
			expect(res.body.result).to.equal(true);
		});
	});

	// 체크인 후, 강제 체크아웃
	describe(`[${getCallerInfo()}] 유저 강제 체크아웃`, () => {
		it('강제체크아웃이 정상적으로 작동하는가?', async (done) => {
			const res = await request(app).post(`/user/forceCheckout/${userID}`).set('Cookie', [ cookie ]);
			expect(res.body.result).to.equal(true);
		});
	});

	// 체크인 후, 강제 체크아웃 중복실행
	describe(`[${getCallerInfo()}] 이미 체크아웃된 유저 강제 체크아웃`, () => {
		it('에러가 발생하는가?', async (done) => {
			const res = await request(app).post(`/user/forceCheckout/${userID}`).set('Cookie', [ cookie ]);
			expect(res.status).to.equal(httpStatus.BAD_REQUEST);
			expect(res.body.code).to.equal(httpStatus.BAD_REQUEST);
		});
	});
});
