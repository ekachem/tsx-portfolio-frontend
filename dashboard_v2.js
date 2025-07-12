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

loginButton.addEventListener('click', () => {
  signInWithPopup(auth, provider)
    .then(result => console.log('Google login:', result.user.email))
    .catch(error => console.error('Google login error:', error.message));
});

registerButton.addEventListener('click', () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  createUserWithEmailAndPassword(auth, email, password)
    .then(userCredential => console.log('Registered:', userCredential.user.email))
    .catch(error => console.error('Register error:', error.message));
});

emailLoginButton.addEventListener('click', () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  signInWithEmailAndPassword(auth, email, password)
    .then(userCredential => console.log('Email login:', userCredential.user.email))
    .catch(error => console.error('Email login error:', error.message));
});

logoutButton.addEventListener('click', () => {
  signOut(auth)
    .then(() => console.log('Logged out'))
    .catch(error => console.error('Logout error:', error.message));
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
        analysisResult.textContent = `Value: $${result.latest_value}, Growth: ${result.growth}%`;
      } catch (error) {
        analysisResult.textContent = 'Analysis failed.';
        console.error(error);
      }
    });

  } else {
    userInfo.textContent = 'Not logged in';
    loginButton.style.display = 'inline';
    logoutButton.style.display = 'none';
    portfolioSection.style.display = 'none';
  }
});

