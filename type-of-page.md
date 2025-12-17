Static html: nội dung html không yêu cầu javascript để hiển thị hoặc tạo ra nội dung động. Khi làm việc với html tĩnh, chúng ta sẽ xử lý trực tiếp cấu trúc và dữ liệu có sẵn trong mã html được tải xuống.
crawler được sử dụng: CheerioCrawler

JSDOM: là một triển khai tiêu chuẩn web, đặc biệt là DOM và JavaScript, trong môi trường Node.js. Nó tạo ra môi trường trình duyệt mô phỏng, cung cấp các đối tượng window và document cho phép thao tác DOM và chạy JavaScript. JSDOMCrawler trong Crawlee sử dụng các yêu cầu HTTP để lấy trang và sau đó sử dụng thư viện jsdom để tạo một môi trường DOM mô phỏng. Điều này cho phép nó xử lý các trang không quá phụ thuộc vào JavaScript phía client nhưng vẫn cần tương tác DOM, thậm chí có thể chạỵ javascript tùy chọn bên trong JSDOM bằng cách sử dụng tùy chọn runScripts. Tuy nhiên, JSDOM không triển khai tất cả tiêu chuẩn trình duyệt nên 1 số trang sẽ không hoạt động đúng.

