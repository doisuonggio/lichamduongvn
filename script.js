document.getElementById("subscribe-form").addEventListener("submit", function(e) {
  e.preventDefault();
  const form = e.target;
  const data = new FormData(form);
  const message = document.getElementById("form-message");

  fetch(form.action, {
    method: form.method,
    body: data,
    headers: {
      'Accept': 'application/json'
    }
  }).then(response => {
    if (response.ok) {
      message.textContent = "✅ Cảm ơn bạn đã đăng ký!";
      form.reset();
    } else {
      message.textContent = "❌ Có lỗi xảy ra. Vui lòng thử lại.";
    }
  }).catch(() => {
    message.textContent = "⚠️ Không thể kết nối server.";
  });
});
