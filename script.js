const products = [
    { id: 1, name: "Red Fuji Apple", price: 5.99, isEco: true },
    { id: 2, name: "Whole Milk", price: 12.50, isEco: true },
    { id: 3, name: "Whole Wheat Bread", price: 8.99, isEco: true },
    { id: 4, name: "Farm Fresh Eggs", price: 15.00, isEco: true },
    { id: 5, name: "Natural Mineral Water", price: 2.50, isEco: true },
    { id: 6, name: "Fresh Beef", price: 18.99, isEco: true },
    { id: 7, name: "Moisturizing Body Wash", price: 7.99, isEco: false },
    { id: 8, name: "Raw Chicken Legs", price: 9.99, isEco: true },
    { id: 9, name: "Dark Chocolate", price: 4.99, isEco: false },
    { id: 10, name: "Fresh Cucumber", price: 1.99, isEco: true },
    { id: 11, name: "Vanilla Ice Cream", price: 3.99, isEco: false },
    { id: 12, name: "Ballpoint Pen", price: 2.49, isEco: false },
    { id: 13, name: "Long Grain Rice", price: 6.99, isEco: true },
    { id: 14, name: "Nourishing Shampoo", price: 8.49, isEco: false },
    { id: 15, name: "Fresh Avocado", price: 3.49, isEco: true },
    { id: 16, name: "Fresh Salmon Fillet", price: 22.99, isEco: true },
    { id: 17, name: "Green Apple Pack", price: 6.49, isEco: true },
    { id: 18, name: "Organic Banana Bunch", price: 2.99, isEco: true },
    { id: 19, name: "Roma Tomato Box", price: 4.29, isEco: true },
    { id: 20, name: "Fresh Lemon Bag", price: 3.50, isEco: true },
    { id: 21, name: "Frozen Shrimp Pack", price: 14.99, isEco: true },
    { id: 22, name: "Premium Pork Chops", price: 12.49, isEco: true },
    { id: 23, name: "Ground Turkey", price: 10.99, isEco: true },
    { id: 24, name: "Cod Fish Fillets", price: 19.99, isEco: true }
];

let cart = [];
const allCards = document.querySelectorAll('.product-card');
let currentPID = "";

document.addEventListener('DOMContentLoaded', function () {
    function getPID() {
        let pid = localStorage.getItem("participantID");
        // 如果沒有找到 ID（例如用戶直接輸入網址進入），可給予預設值或引導回問卷
        if (!pid || pid.trim() === "") {
            pid = "Anonymous";
            localStorage.setItem("participantID", pid);
        }
        return pid.trim();
    }
    currentPID = getPID();
});

let clickCount = parseInt(localStorage.getItem('siteClickCount')) || 0;
let totalSpent = parseFloat(localStorage.getItem('totalSpentMoney')) || 0;
let orderList = JSON.parse(localStorage.getItem('allOrders')) || [];
let abandonCartLogs = JSON.parse(localStorage.getItem('abandonCartLogs')) || [];

document.addEventListener('click', function () {
    clickCount++;
    localStorage.setItem('siteClickCount', clickCount);
});

const visitStart = new Date();
window.addEventListener('beforeunload', function () {
    const end = new Date();
    const ms = end - visitStart;
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    const duration = `${min} 分 ${s} 秒`;

    const logObj = {
        participantID: currentPID,
        enter: visitStart.toLocaleString(),
        leave: end.toLocaleString(),
        totalSecond: sec,
        showTime: duration
    };
    let logs = JSON.parse(localStorage.getItem('freshmartVisitLogs')) || [];
    logs.push(logObj);
    localStorage.setItem('freshmartVisitLogs', JSON.stringify(logs));
});

document.querySelectorAll('.cate-filter').forEach(item => {
    item.addEventListener('click', function () {
        const type = this.dataset.type;
        document.querySelectorAll('.product-card').forEach(card => {
            if (type === 'all' || card.dataset.type === type) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        })
    })
})

document.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        const pid = parseInt(this.dataset.id);
        const item = products.find(p => p.id === pid);
        const exist = cart.find(c => c.id === pid);
        if (exist) exist.quantity += 1;
        else cart.push({ id: pid, name: item.name, price: item.price, quantity: 1 });
        updateCart();
    })
})

function updateCart() {
    const cartCountEl = document.getElementById('cart-count');
    const cartItemsEl = document.getElementById('cart-items');
    const subTotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('total');

    let totalNum = 0;
    cart.forEach(i => totalNum += i.quantity);
    cartCountEl.textContent = totalNum;

    if (cart.length === 0) {
        cartItemsEl.innerHTML = '<p class="empty-cart">Your cart is empty.</p>';
    } else {
        cartItemsEl.innerHTML = '';
        cart.forEach(item => {
            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <span>${item.name}</span>
                <span>$${(item.price * item.quantity).toFixed(2)}</span>
                <div class="item-controls">
                    <button onclick="changeQty(${item.id},-1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="changeQty(${item.id},1)">+</button>
                    <button onclick="removeItem(${item.id})">Remove</button>
                </div>
            `;
            cartItemsEl.appendChild(div);
        })
    }

    let sum = 0;
    cart.forEach(i => sum += i.price * i.quantity);
    subTotalEl.textContent = `$${sum.toFixed(2)}`;
    totalEl.textContent = `$${sum.toFixed(2)}`;
}

function changeQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) removeItem(id);
    else updateCart();
}

function removeItem(id) {
    const tempCart = [...cart];
    cart = cart.filter(i => i.id !== id);
    if (cart.length === 0 && tempCart.length > 0) {
        recordAbandon(tempCart);
    }
    updateCart();
}

function recordAbandon(cartData) {
    let sum = 0;
    cartData.forEach(i => sum += i.price * i.quantity);
    const items = cartData.map(i => ({ name: i.name, quantity: i.quantity, price: i.price }));
    const log = {
        participantID: currentPID,
        abandonTime: new Date().toLocaleString(),
        cartItems: items,
        cartTotal: sum
    };
    abandonCartLogs.push(log);
    localStorage.setItem('abandonCartLogs', JSON.stringify(abandonCartLogs));
}

document.getElementById('clear-cart').addEventListener('click', function () {
    if (cart.length > 0) recordAbandon([...cart]);
    cart = [];
    updateCart();
})

document.getElementById('checkout-btn').addEventListener('click', function () {
    if (cart.length === 0) {
        alert("Your cart is empty, cannot checkout");
        return;
    }
    let total = 0;
    let ecoCnt = 0;
    cart.forEach(item => {
        total += item.price * item.quantity;
        const prod = products.find(p => p.id === item.id);
        if (prod.isEco) ecoCnt += item.quantity;
    })
    const itemsArr = cart.map(i => ({ name: i.name, quantity: i.quantity, price: i.price }));
    const order = {
        participantID: currentPID,
        time: new Date().toLocaleString(),
        items: itemsArr,
        ecoProductCount: ecoCnt,
        orderTotal: total
    };
    orderList.push(order);
    localStorage.setItem('allOrders', JSON.stringify(orderList));
    totalSpent += total;
    localStorage.setItem('totalSpentMoney', totalSpent.toFixed(2));
    alert(`Checkout Success!\nTotal: $${total.toFixed(2)}`);
    cart = [];
    updateCart();
})

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
    })
})

updateCart();