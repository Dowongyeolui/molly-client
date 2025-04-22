import { browser } from "k6/browser";
import { sleep } from "k6";
import { check } from "k6";
import { SharedArray } from "k6/data";

// 테스트 구성
export const options = {
  scenarios: {
    browser: {
      executor: "shared-iterations",
      options: {
        browser: {
          type: "chromium",
        },
      },
      vus: 5,
      iterations: 5,
      maxDuration: "5m",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<5000"],
    checks: ["rate>0.9"],
  },
};

// 테스트용 사용자 데이터
const users = new SharedArray("users", function () {
  return [
    { username: "test@test.com", password: "test123@" },
    { username: "testuser2@example.com", password: "test123@" },
  ];
});

export default async function () {
  const page = browser.newPage();

  try {
    // 사용자 선택
    const user = users[Math.floor(Math.random() * users.length)];

    // 1. 로그인 단계
    console.log("--- 로그인 단계 시작 ---");
    await (await page).goto("https://mollymol.com/login");

    // 로그인 폼이 표시될 때까지 대기
    await (
      await page
    ).waitForSelector('input[name="username"]', { timeout: 10000 });

    // 사용자 정보 입력
    await (await page).type('input[name="username"]', user.username);
    await (await page).type('input[name="password"]', user.password);

    // 로그인 버튼 클릭
    await (await page).click('button[type="submit"]');

    // 로그인 후 페이지 로드 대기
    await (await page).waitForNavigation({ timeout: 10000 });

    // 로그인 성공 확인 (사용자 메뉴 또는 특정 요소 확인)
    const loginSuccess = await (await page).isVisible(".bg-white");
    check(null, {
      "로그인 성공": () => loginSuccess,
    });

    // 2. 장바구니 페이지 접근
    console.log("--- 장바구니 접근 단계 시작 ---");
    await (await page).goto("https://mollymol.com/cart");

    // 장바구니 페이지 로드 대기
    await (await page).waitForSelector(".bg-white", { timeout: 10000 });

    // 장바구니 페이지 로드 확인
    const cartPageLoaded = await (await page).isVisible(".bg-white");
    check(null, {
      "장바구니 페이지 로드 완료": () => cartPageLoaded,
    });

    // 3. 전체 선택 체크박스 테스트
    console.log("--- 전체 선택 테스트 ---");
    // 전체 선택 체크박스 찾기
    const selectAllCheckbox = await (
      await page
    ).$('input[type="checkbox"]:first-of-type');
    if (selectAllCheckbox) {
      // 체크박스 클릭
      await selectAllCheckbox.click();

      // 모든 상품이 선택되었는지 확인
      const allChecked = await (
        await page
      ).evaluate(() => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        return Array.from(checkboxes)
          .slice(1)
          .every((cb) => cb.checked);
      });

      check(null, {
        "전체 선택 기능 동작": () => allChecked,
      });
    }

    // 4. 옵션 변경 테스트
    console.log("--- 옵션 변경 테스트 ---");
    // 첫 번째 상품의 옵션 변경 버튼 찾기
    const optionButton = await (await page).$('button:has-text("옵션 변경")');
    if (optionButton) {
      // 옵션 변경 버튼 클릭
      await optionButton.click();

      // 옵션 모달이 표시되는지 확인
      const modalVisible = await (await page).isVisible(".fixed.inset-0");
      check(null, {
        "옵션 변경 모달 표시": () => modalVisible,
      });

      // 모달 닫기
      const closeButton = await (
        await page
      ).$('.fixed.inset-0 button:has-text("X")');
      if (closeButton) {
        await closeButton.click();
      }
    }

    // 5. 삭제 기능 테스트
    console.log("--- 삭제 기능 테스트 ---");
    // 상품 개수 확인
    const initialItemCount = await (
      await page
    ).evaluate(() => document.querySelectorAll(".mt-4.bg-white").length);

    // 첫 번째 상품의 삭제 버튼 찾기
    const deleteButton = await (await page).$('button:has-text("삭제")');
    if (deleteButton && initialItemCount > 0) {
      // 삭제 버튼 클릭
      await deleteButton.click();

      // 삭제 후 상품 개수 변화 확인
      await (await page).waitForTimeout(1000); // 삭제 처리 대기
      const newItemCount = await (
        await page
      ).evaluate(() => document.querySelectorAll(".mt-4.bg-white").length);

      check(null, {
        "상품 삭제 기능 동작": () =>
          newItemCount === initialItemCount - 1 || initialItemCount === 0,
      });
    }

    // 6. 주문 버튼 테스트 (클릭만 테스트, 실제 주문은 하지 않음)
    console.log("--- 주문 버튼 테스트 ---");
    // 적어도 하나의 상품이 선택되어 있으면
    const anySelected = await page.evaluate(() => {
      const checkboxes = document.querySelectorAll(
        '.mt-4.bg-white input[type="checkbox"]'
      );
      return Array.from(checkboxes).some((cb) => cb.checked);
    });

    if (anySelected) {
      // 주문 버튼 찾기
      const orderButton = await (await page).$(".sticky.bottom-0 button");
      if (orderButton) {
        // 주문 버튼 클릭 가능 여부 확인
        const orderButtonEnabled = await (
          await page
        ).evaluate(() => {
          const button = document.querySelector(".sticky.bottom-0 button");
          return !button.disabled;
        });

        check(null, {
          "주문 버튼 활성화": () => orderButtonEnabled,
        });

        // 실제 주문은 하지 않음 (테스트 환경에서)
      }
    }

    // CLS 점수 측정
    const clsScore = await (
      await page
    ).evaluate(() => {
      return new Promise((resolve) => {
        // 이미 레이아웃 이동이 발생했을 수 있으므로 기존 PerformanceObserver 항목 확인
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          let clsValue = 0;

          entries.forEach((entry) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });

          resolve(clsValue);
        });

        observer.observe({ type: "layout-shift", buffered: true });

        // 3초 후에도 값을 반환하도록 함
        setTimeout(() => {
          observer.disconnect();
          resolve(0); // 측정 실패 시 기본값
        }, 3000);
      });
    });

    console.log(`CLS 점수: ${clsScore}`);
    check(null, {
      "CLS 점수가 0.1 이하": () => clsScore <= 0.1,
    });

    // 완료된 테스트에 대한 정보 수집
    const performance = {
      loadTime: await (
        await page
      ).evaluate(
        () =>
          performance.timing.loadEventEnd - performance.timing.navigationStart
      ),
      domContentLoaded: await (
        await page
      ).evaluate(
        () =>
          performance.timing.domContentLoadedEventEnd -
          performance.timing.navigationStart
      ),
    };

    console.log(
      `페이지 로드 시간: ${performance.loadTime}ms, DOM 로드 시간: ${performance.domContentLoaded}ms`
    );

    sleep(1); // 부하 조절용 대기
  } catch (error) {
    console.error(`테스트 실패: ${error.message}`);
  } finally {
    (await page).close();
  }
}
