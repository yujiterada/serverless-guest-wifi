import './App.css';

import { BrowserRouter as Router, Route } from 'react-router-dom'

import CheckIn from './CheckIn'
import Management from './Management'
import SignIn from './SignIn'

function App() {
  return (
    <div className="App">
      <Router>
        <Route path='/checkin' exact component={ CheckIn } />
        <Route path='/management' exact component={ Management } />
        <Route path='/signin' exact component={ SignIn } />
      </Router>
    </div>
  );
}

export default App;
