import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="static-page not-found-page">
      <div className="not-found-content">
        <div className="not-found-code">404</div>
        <h1>페이지를 찾을 수 없습니다</h1>
        <p>
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
          <br />
          주소를 다시 확인해 주세요.
        </p>
        <div className="not-found-actions">
          <Link to="/" className="home-btn">
            홈으로 가기
          </Link>
          <Link to="/explore" className="explore-btn">
            설문 둘러보기
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
