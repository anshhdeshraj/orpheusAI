import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import OnboardingWrapper from './pages/Onboarding';
import Chat from './pages/Chat';
import News from './pages/News';
import Alerts from './pages/Alerts';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<OnboardingWrapper />} />
        <Route path="/home" element={<Home />} />
        <Route path='/chat' element={<Chat />} />
        <Route path='/news' element={<News />} />
        <Route path='/alerts' element={<Alerts />} />
      </Routes>
    </Router>
  );
};

export default App;