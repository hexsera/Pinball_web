import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'https://hexsera.com';

export const options = {
  stages: [
    { duration: '30s', target: 5   },  // 워밍업
    { duration: '60s', target: 20  },  // 경량 부하
    { duration: '60s', target: 50  },  // 중간 부하
    { duration: '60s', target: 100 },  // 고부하
    { duration: '60s', target: 200 },  // 최고 부하
    { duration: '10s', target: 0   },  // 종료
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // p95 2초 이하 목표
    http_req_failed:   ['rate<0.05'],   // 에러율 5% 이하 목표
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/api/v1/monthly-scores`);
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
