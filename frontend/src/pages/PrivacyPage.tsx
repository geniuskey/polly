const PrivacyPage = () => {
  return (
    <div className="static-page legal-page">
      <h1>개인정보처리방침</h1>
      <p className="legal-updated">최종 수정일: 2025년 1월 31일</p>

      <section className="legal-section">
        <h2>1. 개인정보의 수집 항목 및 방법</h2>
        <h3>1.1 수집하는 개인정보 항목</h3>
        <p><strong>필수 항목 (회원가입 시):</strong></p>
        <ul>
          <li>소셜 로그인 식별자 (카카오/네이버/구글 ID)</li>
          <li>이메일 주소</li>
        </ul>
        <p><strong>선택 항목 (프로필 설정 시):</strong></p>
        <ul>
          <li>성별</li>
          <li>연령대</li>
          <li>거주 지역</li>
        </ul>
        <p><strong>자동 수집 항목:</strong></p>
        <ul>
          <li>서비스 이용 기록 (투표 기록, 설문 생성 기록)</li>
          <li>접속 로그, IP 주소</li>
          <li>기기 정보 (중복 투표 방지용 fingerprint)</li>
        </ul>

        <h3>1.2 수집 방법</h3>
        <ul>
          <li>소셜 로그인을 통한 회원가입</li>
          <li>서비스 이용 과정에서 자동 생성/수집</li>
          <li>이용자의 직접 입력</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>2. 개인정보의 이용 목적</h2>
        <ul>
          <li><strong>서비스 제공:</strong> 설문 참여, 결과 확인, 통계 분석 제공</li>
          <li><strong>회원 관리:</strong> 본인 확인, 부정 이용 방지</li>
          <li><strong>서비스 개선:</strong> 신규 서비스 개발, 이용 통계 분석</li>
          <li><strong>중복 투표 방지:</strong> 기기 fingerprint를 통한 동일 설문 중복 참여 방지</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>3. 개인정보의 보유 및 이용 기간</h2>
        <ul>
          <li><strong>회원 정보:</strong> 회원 탈퇴 시까지 (탈퇴 후 즉시 파기)</li>
          <li><strong>투표 기록:</strong> 설문 종료 후 1년간 보관</li>
          <li><strong>접속 로그:</strong> 3개월간 보관</li>
        </ul>
        <p>단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>
      </section>

      <section className="legal-section">
        <h2>4. 개인정보의 제3자 제공</h2>
        <p>
          VibePulse는 이용자의 개인정보를 원칙적으로 제3자에게 제공하지 않습니다.
          다만, 다음의 경우에는 예외로 합니다:
        </p>
        <ul>
          <li>이용자가 사전에 동의한 경우</li>
          <li>법령에 의해 요구되는 경우</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>5. 개인정보의 처리 위탁</h2>
        <p>VibePulse는 서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁하고 있습니다:</p>
        <table className="legal-table">
          <thead>
            <tr>
              <th>위탁 업체</th>
              <th>위탁 업무</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Clerk</td>
              <td>회원 인증 서비스</td>
            </tr>
            <tr>
              <td>Cloudflare</td>
              <td>서비스 호스팅, 데이터 저장</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="legal-section">
        <h2>6. 교차분석 데이터의 처리</h2>
        <p>
          VibePulse는 "프로필 공개"가 아닌 <strong>"통계 분석에 속성 제공"</strong> 방식을 채택합니다.
        </p>
        <ul>
          <li>이용자가 명시적으로 동의한 항목(성별, 연령대, 지역)만 통계 분석에 활용됩니다.</li>
          <li>교차분석 결과는 최소 5명 이상의 표본이 있을 때만 표시됩니다.</li>
          <li>개별 응답과 개인 프로필이 직접 연결되어 다른 이용자에게 노출되지 않습니다.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>7. 이용자의 권리</h2>
        <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다:</p>
        <ul>
          <li>개인정보 열람 요청</li>
          <li>개인정보 정정 요청</li>
          <li>개인정보 삭제 요청 (회원 탈퇴)</li>
          <li>프로필 속성의 통계 분석 제공 동의 철회</li>
        </ul>
        <p>권리 행사는 프로필 설정 페이지 또는 고객센터를 통해 가능합니다.</p>
      </section>

      <section className="legal-section">
        <h2>8. 개인정보의 안전성 확보 조치</h2>
        <ul>
          <li>모든 통신은 HTTPS를 통해 암호화됩니다.</li>
          <li>개인정보에 대한 접근은 최소한의 인원으로 제한됩니다.</li>
          <li>정기적인 보안 점검을 실시합니다.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>9. 쿠키의 사용</h2>
        <p>
          VibePulse는 서비스 이용 편의를 위해 쿠키를 사용합니다.
          쿠키는 브라우저 설정을 통해 거부할 수 있으나, 이 경우 일부 서비스 이용이 제한될 수 있습니다.
        </p>
      </section>

      <section className="legal-section">
        <h2>10. 개인정보 보호책임자</h2>
        <p>
          개인정보 처리에 관한 문의는 아래 연락처로 문의해 주시기 바랍니다.
        </p>
        <ul>
          <li>이메일: privacy@vibepulse.com</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>11. 개인정보처리방침의 변경</h2>
        <p>
          본 개인정보처리방침은 관련 법령 및 서비스 정책의 변경에 따라 수정될 수 있습니다.
          변경 시 서비스 공지사항을 통해 안내합니다.
        </p>
      </section>

      <section className="legal-section">
        <p className="legal-footer">
          본 개인정보처리방침은 2025년 1월 31일부터 시행됩니다.
        </p>
      </section>
    </div>
  );
};

export default PrivacyPage;
