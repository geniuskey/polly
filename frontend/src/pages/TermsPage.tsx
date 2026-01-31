const TermsPage = () => {
  return (
    <div className="static-page legal-page">
      <h1>이용약관</h1>
      <p className="legal-updated">최종 수정일: 2025년 1월 31일</p>

      <section className="legal-section">
        <h2>제1조 (목적)</h2>
        <p>
          이 약관은 VibePulse(이하 "서비스")의 이용과 관련하여 서비스 제공자와
          이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
        </p>
      </section>

      <section className="legal-section">
        <h2>제2조 (정의)</h2>
        <ol>
          <li>"서비스"란 VibePulse가 제공하는 설문조사 플랫폼 및 관련 제반 서비스를 의미합니다.</li>
          <li>"이용자"란 본 약관에 동의하고 서비스를 이용하는 자를 말합니다.</li>
          <li>"회원"이란 서비스에 회원가입을 한 이용자를 말합니다.</li>
          <li>"설문"이란 이용자가 서비스 내에서 생성하는 질문과 선택지의 조합을 말합니다.</li>
        </ol>
      </section>

      <section className="legal-section">
        <h2>제3조 (약관의 효력 및 변경)</h2>
        <ol>
          <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
          <li>서비스 제공자는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있습니다.</li>
          <li>변경된 약관은 공지 후 7일이 경과한 시점부터 효력이 발생합니다.</li>
        </ol>
      </section>

      <section className="legal-section">
        <h2>제4조 (서비스의 제공)</h2>
        <p>서비스는 다음과 같은 기능을 제공합니다:</p>
        <ol>
          <li>설문 생성 및 관리</li>
          <li>설문 참여 (투표)</li>
          <li>투표 결과 열람</li>
          <li>교차분석 결과 제공 (성별, 연령대별 등)</li>
          <li>기타 서비스 제공자가 정하는 서비스</li>
        </ol>
      </section>

      <section className="legal-section">
        <h2>제5조 (이용자의 의무)</h2>
        <p>이용자는 다음 행위를 하여서는 안 됩니다:</p>
        <ol>
          <li>허위 정보의 등록</li>
          <li>타인의 정보 도용</li>
          <li>서비스에 게시된 정보의 무단 변경</li>
          <li>서비스 운영을 고의로 방해하는 행위</li>
          <li>음란, 폭력, 혐오 등 불건전한 내용의 설문 등록</li>
          <li>영리 목적의 광고성 설문 등록 (사전 승인 없이)</li>
          <li>동일 설문에 대한 중복 투표 시도</li>
          <li>기타 관련 법령에 위반되는 행위</li>
        </ol>
      </section>

      <section className="legal-section">
        <h2>제6조 (서비스 제공자의 의무)</h2>
        <ol>
          <li>서비스 제공자는 관련 법령과 본 약관을 준수하며, 지속적이고 안정적인 서비스 제공을 위해 노력합니다.</li>
          <li>서비스 제공자는 이용자의 개인정보를 보호하기 위해 개인정보처리방침을 수립하고 준수합니다.</li>
          <li>서비스 제공자는 이용자로부터 제기되는 의견이나 불만이 정당하다고 인정할 경우 적절한 조치를 취합니다.</li>
        </ol>
      </section>

      <section className="legal-section">
        <h2>제7조 (게시물의 관리)</h2>
        <ol>
          <li>이용자가 등록한 설문 및 댓글의 저작권은 해당 이용자에게 있습니다.</li>
          <li>서비스 제공자는 다음에 해당하는 게시물을 사전 통지 없이 삭제하거나 이동할 수 있습니다:
            <ul>
              <li>본 약관을 위반한 경우</li>
              <li>관련 법령을 위반한 경우</li>
              <li>타인의 권리를 침해한 경우</li>
            </ul>
          </li>
        </ol>
      </section>

      <section className="legal-section">
        <h2>제8조 (서비스 이용의 제한)</h2>
        <p>
          서비스 제공자는 이용자가 본 약관의 의무를 위반하거나 서비스의 정상적인 운영을
          방해한 경우, 서비스 이용을 제한하거나 회원 자격을 정지할 수 있습니다.
        </p>
      </section>

      <section className="legal-section">
        <h2>제9조 (면책조항)</h2>
        <ol>
          <li>서비스 제공자는 천재지변, 시스템 장애 등 불가항력적 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.</li>
          <li>서비스 제공자는 이용자가 서비스를 통해 얻은 정보의 정확성, 신뢰성에 대해 보증하지 않습니다.</li>
          <li>서비스 제공자는 이용자 간 또는 이용자와 제3자 간의 분쟁에 대해 개입하지 않으며 이에 대한 책임을 지지 않습니다.</li>
        </ol>
      </section>

      <section className="legal-section">
        <h2>제10조 (준거법 및 관할법원)</h2>
        <p>
          본 약관의 해석 및 서비스 이용에 관한 분쟁은 대한민국 법령을 적용하며,
          분쟁 발생 시 서비스 제공자의 소재지를 관할하는 법원을 관할법원으로 합니다.
        </p>
      </section>

      <section className="legal-section">
        <p className="legal-footer">
          본 약관은 2025년 1월 31일부터 시행됩니다.
        </p>
      </section>
    </div>
  );
};

export default TermsPage;
