const outputElement = document.getElementById('output');
const commands = [
    "    ; rdi = message pointer",
  "    ; rsi = length",
  "    mov     rax, 1          ; sys_write",
  "    mov     rdi, 1          ; stdout",
  "    syscall",
  "    ret",
  "    mov     rax, 60         ; sys_exit",
  "    xor     rdi, rdi",
  "    syscall",
  "section .data",
  "    msg1 db \"Hãy cẩn trọng khi sử dụng.\", 10, 0",
  "    len1 equ $ - msg1",

  "    msg2 db \"Tuân thủ luật pháp, tôn trọng mọi người.\", 10, 0",
  "    len2 equ $ - msg2",

  "    msg3 db \"Thông tin có thể là giả, chúng tôi không chịu trách nhiệm.\", 10, 0",
  "    len3 equ $ - msg3",

  "    msg4 db \"Ẩn danh nhưng chúng tôi vẫn biết bạn.\", 10, 0",
  "    len4 equ $ - msg4",

  "    msg5 db \"VPN? Nó không giúp bạn thoát khỏi chúng tôi.\", 10, 0",
  "    len5 equ $ - msg5",

  "    msg6 db \"Hi vọng bạn có trải nghiệm tốt.\", 10, 0",
  "    len6 equ $ - msg6",
  "section .text",
  "    global _start",

];

let commandIndex = 0;
let charIndex = 0;
let currentCommand = '';
let isTypingComplete = false;
const secretCode = "177013";
function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min; 
}
function getUsername() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('username');
}
function checkSecretCode(code) {
  return code === secretCode;
}
const passwordDisplay = document.createElement('div');
passwordDisplay.id = 'passwordDisplay';
document.body.appendChild(passwordDisplay);
document.addEventListener('keydown', (event) => {
    if (isTypingComplete) { 
        resetAutoRedirect();
        let pressedKeys = (document.getElementById('secretInput') || {}).value || '';
        if (event.key === 'Backspace') {
          pressedKeys = pressedKeys.slice(0, -1);
          document.getElementById('secretInput').value = pressedKeys;
          passwordDisplay.textContent = '*'.repeat(pressedKeys.length);
        }
        
        if (event.key.length === 1) {
            pressedKeys += event.key;
            if (!document.getElementById('secretInput')) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.id = 'secretInput';
                document.body.appendChild(input);
            }
            document.getElementById('secretInput').value = pressedKeys;
            passwordDisplay.textContent = '*'.repeat(pressedKeys.length);
            
            if (pressedKeys.length === secretCode.length) {
                if (checkSecretCode(pressedKeys)) {
                    window.location.href = 'secret.html';
                } else {
                    document.getElementById('secretInput').value = '';
                }
            }
            if (pressedKeys.length >= secretCode.length) {
              return; 
            }
        }
    }
});

function type() {
  if (commandIndex < commands.length) {
    currentCommand = commands[commandIndex];

    if (charIndex < currentCommand.length) {
      outputElement.innerHTML += currentCommand.charAt(charIndex);
      charIndex++;
      setTimeout(type, getRandomDelay(3, 100)); 
      } else {
          
        outputElement.innerHTML += '<br>'; 
        commandIndex++;
        charIndex = 0;
        setTimeout(type, 1000); 
        }
  } else {
        isTypingComplete = true;
        outputElement.innerHTML += '<br>>>Cứ bộc lộ bản chất của bạn thoải mái<<<';
        setupAutoRedirect();
    }
  if (charIndex < currentCommand.length) {
    outputElement.classList.remove('done'); 
    } else {
      outputElement.classList.add('done'); 
  }
        
}
function startTyping() {
    outputElement.innerHTML = ''; 
    commandIndex = 0;
    charIndex = 0;
    type();
}
startTyping(); 
function startTest() {
  var username = document.getElementById('username').value;
  var password = document.getElementById('password').value;
  if (username && password) {
    window.location.href = 'chat/index.html=';
    } else {
      setTimeout(() => {
        const username = getUsername();
        window.location.href = 'chat/index.html=';
      }, 1000);
    }
}
let autoRedirectTimer;
const TIMEOUT_DURATION = 5000;
function setupAutoRedirect() {
    if (autoRedirectTimer) {
        clearTimeout(autoRedirectTimer);
    }
    autoRedirectTimer = setTimeout(() => {
        window.location.href = 'chat/index.html';
    }, TIMEOUT_DURATION);
}
function resetAutoRedirect() {
    if (autoRedirectTimer) {
        clearTimeout(autoRedirectTimer);
    }
    setupAutoRedirect();
}
