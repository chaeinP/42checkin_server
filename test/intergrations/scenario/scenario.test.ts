import request from 'supertest';
import { app } from '../../../src/app';
import { describe, it, before } from 'mocha';
import { expect } from 'chai';
import { CLUSTER_CODE } from '../../../src/modules/cluster';
import { Config as IConfig } from '../../../src/models/config';
import {getTimeFormat, getTimezoneDate} from '../../../src/modules/util';
// @ts-ignore
import { getCookie } from '../mock';
import {Database} from "../../../src/models/database";
import { getCallerInfo } from '../../../src/modules/util';
import logger from '../../../src/modules/logger';
import {apiStatus} from "../../../src/modules/api.status";

let cookie = '';

/**
 * 최대 수용인원수 가까이 체크인 했을때, 경계 테스트
 * 1. 로그인 (가정) V
 * 2. 쿠키 받음 V
 * 3. 회원수 체크 V
 * 4. 모두 강제 체크아웃 시키기 V
 * 5. 최대수용인원 5으로 설정 V
 * 6. 한명씩 체크인 <- 어떻게 해야하는가? -> (cardRepo에서 카드만 using 상태로 변경)
 * 7. 남은인원 5명이하일 경우 디스코드 알림발송
 * 8. 남은인원 0명일 경우 체크인 시도
 */
describe(`[${getCallerInfo()}] 최대 수용인원수 가까이 입장했을때, 체크인 시스템 경계 테스트 진행`, async () => {
    let originCapacity: IConfig;
    const today = getTimezoneDate(new Date()).toISOString().slice(0, 10)

    before(async () => {
        // 서버에서 디비가 연결될 경우 emit하는 값을 감지한 후 done()을 호출해, 테스트 케이스를 시작한다.
        await Database().authenticate();
        cookie = await getCookie();
        const forceCheckoutAll = (users: any) =>
            Promise.all(
                users.map((user: any) => {
                    return request(app)
                        .post(`/user/forceCheckout/${user._id}`)
                        .set('Cookie', [cookie]);
                })
            );
        const checkoutAllIn = (cluster: number) =>
            request(app)
                .get(`/log/checkIn/${cluster}`)
                .query({ page: 1, listSize: 1000 })
                .set('Cookie', [cookie])
                .then(async (res) => await forceCheckoutAll(res.body.list));
        await checkoutAllIn(CLUSTER_CODE.seocho);
        await checkoutAllIn(CLUSTER_CODE.gaepo);
        let res = await request(app).get(`/user/using`).set('Cookie', [cookie])
        logger.log(JSON.stringify(res));

        // 테스트 시작 전에 이전 테스트 실패로 값이 변경된 상태일 수 있으므로 초기화 한다.
        res = await request(app).put(`/config`).send({ env: { gaepo: 12, seocho: 34 }, today }).set('Cookie', [cookie]);
        logger.log(JSON.stringify(res));
    });

    describe(`[${getCallerInfo()}] 시나리오 테스트시작전 준비상황 확인 및 환경 설정`, () => {
        it('체크인한 유저가 0명인지 확인', async () => {
            const res = await request(app).get(`/user/using`).query({ today }).set('Cookie', [cookie]);
            expect(res.body[CLUSTER_CODE[0]]).to.be.equal(0);
            expect(res.body[CLUSTER_CODE[1]]).to.be.equal(0);
        });

        it('최대수용가능 인원수를 확인', async () => {
            const res = await request(app).get(`/config`).query({ today }).set('Cookie', [cookie]);
            originCapacity = res.body;
            expect(res.body.gaepo).to.be.a('number');
            expect(res.body.env).to.be.a('string');
        });

        it('최대수용가능 인원수를 5명으로 수정', async () => {
            const res = await request(app).put(`/config`).send({ env: { gaepo: 5 }, today }).set('Cookie', [cookie]);
            expect(res.body.gaepo).to.be.equal(5);
            expect(res.body.env).to.be.a('string');
        });
    });

    describe(`[${getCallerInfo()}] 출입가능 인원이 5명이하인 경우 체크인 테스트`, () => {
        it('5명이하일때, 체크인 시도 반환값 중 notice가 true인가?', async () => {
            // 체크인
            const cardID = 9;
            const res = await request(app).post(`/user/checkIn/${cardID}`).set('Cookie', [cookie]);
            expect(res.body.result).to.equal(true);
            expect(res.body.payload?.notice).to.equal(true);
        });
    });

    describe(`[${getCallerInfo()}] 출입가능인원이 꽉찬 경우 테스트`, () => {
        it('유저의 상태로 체크아웃으로 변경', async () => {
            const res = await request(app).post(`/user/checkOut`).set('Cookie', [cookie]);
            expect(res.body.result).to.equal(true);
        });

        it('최대수용가능 인원수를 0명으로 수정', async () => {
            const res = await request(app).put(`/config`).send({ env: { gaepo: 0 }, today }).set('Cookie', [cookie]);
            expect(res.body.gaepo).to.be.equal(0);
            expect(res.body.env).to.be.a('string');
        });

        it('체크인이 불가능한가?', async () => {
            // 체크인
            const cardID = 9;
            const res = await request(app).post(`/user/checkIn/${cardID}`).set('Cookie', [cookie]);
            expect(res.body.result).to.equal(false);
            expect(res.body.code).to.equal(apiStatus.NOT_ACCEPTABLE);
        });

        it('최대수용가능 인원수를 원래대로 복구', async () => {
            const res = await request(app)
                .put(`/config`)
                .send({ env: originCapacity, today })
                .set('Cookie', [cookie]);
            expect(res.body.gaepo).to.be.equal(originCapacity.gaepo);
            expect(res.body.env).to.be.a('string');
        });
    });
});
