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
  addDoc,
  updateDoc,
  deleteDoc,
  doc
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

loginButton.addEventListener('click', () => {
  signInWithPopup(auth, provider).catch(error => showError('Google login error: ' + error.message));
});

registerButton.addEventListener('click', () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) return showError('Please enter email and password to register.');
  createUserWithEmailAndPassword(auth, email, password)
    .then(userCredential => showMessage(`Registered & logged in as ${userCredential.user.email}`))
    .catch(error => showError('Register error: ' + error.message));
});

emailLoginButton.addEventListener('click', () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) return showError('Please enter email and password to login.');
  signInWithEmailAndPassword(auth, email, password)
    .then(userCredential => showMessage(`Logged in as ${userCredential.user.email}`))
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

async function loadPortfolio() {
  const portfolioSnapshot = await getDocs(collection(db, 'users', auth.currentUser.uid, 'portfolio'));
  portfolioList.innerHTML = '';
  portfolioSnapshot.forEach(docSnap => {
    const data = docSnap.data();
    portfolioList.innerHTML += `
      <li class="list-group-item d-flex justify-content-between align-items-center" data-id="${docSnap.id}">
        <span>${data.ticker}: ${data.shares} shares @ $${data.buy_price}</span>
        <div>
          <button class="btn btn-sm btn-warning edit-btn me-2">Edit</button>
          <button class="btn btn-sm btn-danger delete-btn">Delete</button>
        </div>
      </li>`;
  });
}

addStockButton.addEventListener('click', async () => {
  const ticker = tickerInput.value.trim();
  const shares = Number(sharesInput.value);
  const buyPrice = Number(buyPriceInput.value);
  if (!ticker || shares <= 0 || buyPrice <= 0) return showError('Please enter valid ticker, shares, and buy price.');
  try {
    await addDoc(collection(db, 'users', auth.currentUser.uid, 'portfolio'), {
      ticker: ticker.toUpperCase(),
      shares,
      buy_price: buyPrice,
      date: new Date().toISOString().split('T')[0]
    });
    showMessage('Stock added! You should be able to see instant addition now!');
    await loadPortfolio();
    tickerInput.value = '';
    sharesInput.value = '';
    buyPriceInput.value = '';
  } catch (error) {
    showError('Add stock error: ' + error.message);
  }
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    userInfo.textContent = `Logged in as ${user.email}`;
    loginButton.style.display = 'none';
    logoutButton.style.display = 'inline';
    portfolioSection.style.display = 'block';

    const portfolioSnapshot = await getDocs(collection(db, 'users', user.uid, 'portfolio'));
    portfolioList.innerHTML = '';
    portfolioSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      portfolioList.innerHTML += `
        <li data-id="${docSnap.id}">
          ${data.ticker}: ${data.shares} shares @ $${data.buy_price}
          <button class="edit-btn">Edit</button>
          <button class="delete-btn">Delete</button>
        </li>`;
    });
  } else {
    userInfo.textContent = 'Not logged in';
    loginButton.style.display = 'inline';
    logoutButton.style.display = 'none';
    portfolioSection.style.display = 'none';
  }
});

portfolioList.addEventListener('click', async (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  const docId = li.getAttribute('data-id');

  if (e.target.classList.contains('edit-btn')) {
    const newShares = prompt('Enter new number of shares:');
    if (newShares !== null && Number(newShares) > 0) {
      try {
        await updateDoc(doc(db, 'users', auth.currentUser.uid, 'portfolio', docId), {
          shares: Number(newShares)
        });
        showMessage('Stock updated! Please reload to see changes.');
	await loadPortfolio();
      } catch (error) {
        showError('Edit error: ' + error.message);
      }
    }
  }

  if (e.target.classList.contains('delete-btn')) {
    if (confirm('Are you sure you want to delete this stock?')) {
      try {
        await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'portfolio', docId));
        showMessage('Stock deleted! Please reload to see changes.');
	await loadPortfolio();
      } catch (error) {
        showError('Delete error: ' + error.message);
      }
    }
  }
});

analyzeButton.addEventListener('click', async () => {
  try {
    const portfolioSnapshot = await getDocs(collection(db, 'users', auth.currentUser.uid, 'portfolio'));
    const portfolioArray = [];
    portfolioSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      portfolioArray.push({
        ticker: data.ticker,
        shares: data.shares,
        buy_price: data.buy_price,
        date: data.date
      });
    });

    const response = await fetch('https://tsx-portfolio-app.onrender.com/api/analyze-portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(portfolioArray)
    });
    const result = await response.json();

    if (result.error) {
      showError('Backend error: ' + result.error);
    } else {
      analysisResult.textContent = `Portfolio Value: $${result.latest_value}, Growth: ${result.growth}%`;
    }
  } catch (error) {
    showError('Analysis error: ' + error.message);
  }
});

function showMessage(message) {
  userInfo.textContent = message;
}

function showError(errorMessage) {
  userInfo.textContent = `❌ ${errorMessage}`;
}

