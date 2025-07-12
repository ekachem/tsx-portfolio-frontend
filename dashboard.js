import { auth, provider, db } from './firebase.js';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js';
import {
  collection,
  getDocs,
  addDoc
} from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js';

const loginButton = document.getElementById('loginButton');
const logoutButton = document.getElementById('logoutButton');
const userInfo = document.getElementById('userInfo');
const portfolioSection = document.getElementById('portfolioSection');
const portfolioList = document.getElementById('portfolioList');
const analyzeButton = document.getElementById('analyzeButton');
const analysisResult = document.getElementById('analysisResult');

const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const registerButton = document.getElementById('registerButton');
const emailLoginButton = document.getElementById('emailLoginButton');



const tickerInput = document.getElementById('tickerInput');
const sharesInput = document.getElementById('sharesInput');
const buyPriceInput = document.getElementById('buyPriceInput');
const addStockButton = document.getElementById('addStockButton');

addStockButton.addEventListener('click', async () => {
  const ticker = tickerInput.value.trim();
  const shares = Number(sharesInput.value);
  const buyPrice = Number(buyPriceInput.value);

  if (!ticker || shares <= 0 || buyPrice <= 0) {
    showError('Please enter valid ticker, shares, and buy price.');
    return;
  }

  try {
    await addDoc(collection(db, 'users', auth.currentUser.uid, 'portfolio'), {
      ticker: ticker.toUpperCase(),
      shares,
      buy_price: buyPrice,
      date: new Date().toISOString().split('T')[0]
    });
    showMessage('Stock added! Please reload to see updates.');
    tickerInput.value = '';
    sharesInput.value = '';
    buyPriceInput.value = '';
  } catch (error) {
    showError('Add stock error: ' + error.message);
  }
});



loginButton.addEventListener('click', () => {
  signInWithPopup(auth, provider)
    .catch(error => showError('Google login error: ' + error.message));
});

registerButton.addEventListener('click', () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showError('Please enter email and password to register.');
    return;
  }

  createUserWithEmailAndPassword(auth, email, password)
    .then(userCredential => {
      showMessage(`Registered & logged in as ${userCredential.user.email}`);
    })
    .catch(error => showError('Register error: ' + error.message));
});

emailLoginButton.addEventListener('click', () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showError('Please enter email and password to login.');
    return;
  }

  signInWithEmailAndPassword(auth, email, password)
    .then(userCredential => {
      showMessage(`Logged in as ${userCredential.user.email}`);
    })
    .catch(error => showError('Email login error: ' + error.message));
});

logoutButton.addEventListener('click', () => {
  signOut(auth)
    .then(() => {
      showMessage('Logged out');
      portfolioList.innerHTML = '';
      analysisResult.textContent = '';
    })
    .catch(error => showError('Logout error: ' + error.message));
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    userInfo.textContent = `Logged in as ${user.email}`;
    loginButton.style.display = 'none';
    logoutButton.style.display = 'inline';
    portfolioSection.style.display = 'block';

    const portfolioSnapshot = await getDocs(collection(db, 'users', user.uid, 'portfolio'));
    portfolioList.innerHTML = '';
    portfolioSnapshot.forEach(doc => {
      const data = doc.data();
      portfolioList.innerHTML += `<li>${data.ticker}: ${data.shares} shares @ $${data.buy_price}</li>`;
    });

    analyzeButton.addEventListener('click', async () => {
      const portfolioArray = [];
      portfolioSnapshot.forEach(doc => {
        const data = doc.data();
        portfolioArray.push({
          ticker: data.ticker,
          shares: data.shares,
          buy_price: data.buy_price,
          date: data.date
        });
      });

      try {
        const response = await fetch('https://tsx-portfolio-app.onrender.com/api/analyze-portfolio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(portfolioArray)
        });
        const result = await response.json();
        analysisResult.textContent = `Portfolio Value: $${result.latest_value}, Growth: ${result.growth}%`;
      } catch (error) {
        showError('Analysis error: ' + error.message);
      }
    });

  } else {
    userInfo.textContent = 'Not logged in';
    loginButton.style.display = 'inline';
    logoutButton.style.display = 'none';
    portfolioSection.style.display = 'none';
  }
});

function showMessage(message) {
  userInfo.textContent = message;
}

function showError(errorMessage) {
  userInfo.textContent = `❌ ${errorMessage}`;
}

