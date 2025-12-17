Crawlee core architecture provides foundational capabilities:
    * configuration& dependency management
    * request management and queuing
    * concurrency control and autoscaling
    * session and proxy management
    * data persistence and storage
    * error handling and monitoring
    * http client framework and utilities
    * routing and crawler context

Crawlee offers specialized crawler implementations which are tailored to suit different web content types and scraping methodologies.

1. configuration & dependency management
    Crawlee uses **Configuration Class** in @crawlee/core to manage settings.
    default is **crawlee.json**. **Constructor parameters** will be passed when create an instance of **configuration class** and *overwrite* options from **crawlee.json**.
    
    **environment variables** always has the highest prority, allows us to overwrite configs without changing source.

    **Configuration class** also provides access to singleton instances of essential services such as **StorageClient**, **EventManager**. For concurrent operations or testing scenarios where isolated settings are needed, **AsyncLocalStorage** is used to provide context-specific configuration instances.

2. Request Management and queuing
    Crawlee'request management system orchestrates the fetching, processing and enqueuing URLs. forming the backbone of crawling operation. The fundamental unit of this system is the **Request** object. This object will *encapsulates*(gói gọn) details such as the URL, HTTP method, headers, payload, custom metadata (userData).

    * Crawlee allows us to set **skipNavigation** flag on request to ignore navigation and process request directly.

    
    Each request has a **uniqueKey** for deduplication, track **retryCount**, **sessionRotation** to manage request lifecycle and resillience.(phục hồi)

    Requests are managed through 2 primary mechanisms: 
    **RequestList**, **RequestQueue**.
    * The **RequestList** serves as a static, in memory list for managing a predefined set of URLs. It handle deduplication and tracks the lifecycle of requests. This is useful for scenarios where set of URLs to crawl is known beforehand (biết trước)

    * The **RequestQueue** (speciallly **RequestQueueV2**) is utilized for dynamic crawling where URLs are discovered during the scrape. This will extends **RequestProvider** and manage Request objects, ensuring unique requests and handling concurrency, *even across distributed envs*. Main features are included request locking for concurrent processing, advance caching and and the ability to priortize **forefront** requests. 
    (highest priority requests, RequestQueue will tryna return those **forefront** request in next fetchNextRequest() call. Normally, requests will append at the end of the list).
    **RequestQueue** is an inherit class from **RequestProvider**, and implements methods that are defined in  request_queue_v2.ts

    the **RequestManagerTandem** combine both **RequestList** and **RequestQueue**, allowing crawler priortize requests from a static list (init links)  while also processing dynamically discovered URLs. **SitemapRequestList** can parse URLs directly from sitemaps, supporting filtering with *globs and regexps*.

    Intelligent URL discovery and enqueuing are handled by the **equeueLinks** function. This function allows for filtering URLs base on various criteria such as glob patterns, regular expressions and robot.txt

    the **transformRequestFunction** can be provided to edit Request object before they are added to queue.(enabling custom data or label assignments)

    the **onSkippedRequest** is utilized to notify and allow processing requests that are not enqueue or not continued processing by crawler.
    e.g logging and store skipped requests.

3. Concurrency Control and Autoscaling
    Dynamic Concurrency Adjustment: The **AutoscaledPool** monitors system resources and scales the number of parallel tasks to optimize performance and prevent resource exhaustion.
    
    Configuration Options: Can be configured the **AutoscaledPool** using **autoscaledPoolOptions** when initializing a crawler, allowing for fine-tuning parameters like **maxTasksPerminute** as shown in *scaling_crawers_maxRequestPerminute.ts*.

    Concurrency Limits: Specific limits on parallel execution can be set using **minConcurrency** and **maxConcurrency** options, which directly correspond to the **AutoscaledPool**'s underlying settings. An example of this can be found in *scaling_crawlers_minMaxConcurrency.ts*.

    Resource Monitoring: The **SystemStatus** class in *system_status.ts provides a simple interface for reading system status from a **Snapshotter** instance, calculating system load based on weighted averages of overload metrics (memory, event loop, CPU, and client-specific information).

4. Session and Proxy Management
    *   Session Management:
    State Persistence: Each **Session** object can *store* cookies, error scores and usage counts, allowing crawlers to persists authenticated states and track interactions.

    Rotation Logic: Session can be marked as 'bad' or 'retired' based on HTTP status codes or detected blocking. The **SessionPool** automatically switches to a new session when a current one becomes *compromised* (bị hỏng, bị chặn), helping avoid repeated blocking. **session.retireOnBlockedStatusCodes(statusCode) can retired a session if the status code indicates blocking.

    Lifecycle: A session is considered 'usable' if it's not blocked, not expired, and has not reached it's maximum, usage count. Methods like *session.markGood()*,  *session.markBad()* increase or decrease its error score and usage count, influencing its usability.

    Cookie Handling: Sessions provide methods like *session.getCookies()*, *session.setCookies()* and *session.getCookieString()* to manage cookies, and *session.setCookiesFromResponse()* to automatically extract cookies from HTTP responses. In browser crawlers, **persistCookiesPerSession** option ensures cookies are saved and set automatically, as seen in *session_managemement_puppeteer.ts* and *session_management_standalone.ts*

    *   Proxy Management:
    Crawlee offers comprehensive proxy management to distribute requests acrocess muliple IP addresses, preventing single IPs from being blocked.
    **Proxy Configuration**: This class handle proxy settings, supporting custom URL rotation and tiered proxy systems. It manages proxy credentials and ensures unique proxy URls for each session via *proxyConfiguration.newUrl(session.id)* as shown in *session_management_standalone.ts*.

    ProxyConfiguration provides options:
        *proxyUrls*: array of proxy URLs that crawlee rotates through. Each request will typically use the next proxy in the list.
        *newUrlFunction*: A custom asynchronous function that dynamically generates a new proxy URL. This function receives a *sessionId* and optionally a *Request* object, enabling sophisticated proxy selection logic based on session or request details. It can return a proxy URL string or null to indicate no proxy should be used for that request.
        *tieredProxyUrls*: An advanced feature for defining a hierachy of proxy URLs. Requests initially use proxies from the lowest tier. If a proxy from a tier consistently fails for a domain, Crawlee can dynamically switch to a higher tier for that domain. It also periodically probes(thăm dò) lower-level proxies to "downshift" back to more performant tiers.
        *newProxyInfo()* create a *ProxyInfo* object, providing details such as sessionId, url, username, password, hostname, port, proxyTier. This is useful for inspecting the proxy being used for a specific request within a crawler's **requestHandler**. The *newUrl()* method returns a proxy URL string chosen from *proxyUrls, newUrlFunction or tieredProxyUrls*. When a sessionId is provided to *newUrl()* or *newProxyInfo()*, Crawlee ensures that all HTTP requests associated with that session use the same target proxy server, maintaing session stickiness.
        For tiered proxies, *ProxyConfiguration* uses a *ProxyTierTracker* for each domain to monitor error history and predict the best tier for requests. Errors increase a proxy's error score, making it less likely to be chosen and potentially triggering a switch to a higher tier for that domain.
        A crawler with **ProxyConfiguration** instance can be initialized as follow:
        proxy_management_integration_cheerio.ts
        proxy_management_integration_http.ts
        proxy_management_integration_jsdom.ts
        proxy_management_integration_playwright.ts
        proxy_management_integration_puppeteer.ts
    
    Integration with BrowserPool:
        **Anonymizing Proxy URLs(URL proxy ẩn danh)**: the *anonymizeProxySugar* function processes proxy Urls with embedded authentication, creating an anonymized version for browser configuration. It also provides a cleanup function for associated resources.
        **Local Proxy Servers**: *createProxyServerForContainers* sets up a local **ProxyChainServer** for experimental container isolation. This server routes requests based on the client's local IP, allowing individual browser contexts to use different upstream or fallback proxies, enhancing anonymity and authorization.
        **Dynamic Proxy Application**: **PlaywrightPlugin**, **PuppeteerPlugin** use anonymizeProxySugar to configure proxies when launching browser instances or creating new pages, enabling each page or context to potentially use a unique proxy.
        **BrowserPlugin Proxy Configuration**: a **BrowserPlugin** can be initialized with a *proxyUrl* option for simplified setup of authenticated proxies.

    Browser Fingerprinting and Proxy Tiers:
        Browser fingerprinting involves creating, caching and injecting unique browser characteristics into the browser's environment. These fingerprints include details such as the user agent, viewport dimensions and other browser properties to make automated access harder to detect.
        **Fingerprint Generation**: The system uses a **FingerprintGenerator** to create these unique browser fingerprints. **FingerprintGeneratorOptions** allows for customization of parameters like device type, operating system, and screen size to tailor the generated fingerprint.
        **Injection and Caching**: Fingerprints are managed by a **FingerprintInjector**. To optimize performance and consistency across sessions, generated fingerprints can be cached using a Least Recently Used (LRU) cache. The cache key is often derived from session IDs or proxy URLs, ensuring that a consistent browser identity is maintained for the same logical session or proxy.
        **Application via Hooks**: The management of browser fingerprints is integrated into the browser and page lifecycle through a system of hooks:
            *   *PrelaunchHooks*: before a browser instance is lauched, this hook generates or retrieves a fingerprint and associates it with the browser's *launchContext*
            *   *prePageCreateHooks*: For incognito pages in Playwright, a separate *pre-page-create* hook ensures that user agent and viewpoint settings from the generated fingerprint are applied to individual pages, maintaining consistency.
            *   *postPageCreateHooks*: After a page or browser context is created, the *post-page-create* hook injects the full browser fingerprint into the browser's JavaScript environment, allowing the browser to present a consistent identity to websites.
        **Customization and Configuration**: Browser fingerprinting is enabled by default in Crawlee
        *useFingerprints*: Set to false to disable dynamic browser fingerprint generation.
        *fingerprintsOptions*: Allows for more detailed configuration of how fingerprints are generated:
            *fingerprintGeneratorOptions*: Customize fingerprint generation by setting parameters such as DeviceCategory, OperatingSystemName, or BrowserName and minium/maximum versions.
            *useFingerprintCache*: Controls the use of a virtual session management system that links each Crawlee session to a specific browser fingerprint.
            *fingerprintCacheSize*: Sets the maximum number of fingerprints that can be stored in the cached (only relevant if *useFingerprintCache* is *true*)

5.  Data Persistence and Storage:
    * Dataset class: **Dataset** được thiết kế để lưu trữ dữ liệu có cấu trúc được trích xuất. Nó cung cấp các phương thức để đẩy các mục dữ liệu mới, truy xuất dữ liệu đã lưu trữ và xuất chúng ở các định dạng khác nhau. Có thể truy cập dataset mặc định của crawler hoặc một dataset được chỉ định bằng *crawler.getData(idOrName)*. Để lưu trữ dữ liệu có thể sử dụng *crawler.pushData(data, datasetIdOrName)*.

    * KeyValueStore class: **KeyValueStore* cho phép lưu trữ và truy xuất các cặp khóa-giá trị tùy ý. Điều này hữu ích để lưu trữ cấu hình, kết quả trung gian hoặc các dữ liệu phi bảng khác. Nó cũng hỗ trợ các giá trị được tự động lưu để duy trì trạng thái crawler. Có thể truy cập KeyValueStore thông qua crawling context bằng: *crawlingContext.getKeyValueStore(IdOrName)*.KeyValueStore cũng được dùng để duy trì trạng thái crawler, ví dụ:
    BasicCrawler.CRAWLEE_STATE_KEY để lưu trữ trạng thái
    
    * MemoryStorage: *MemoryStorage* là giải pháp lưu trũ linh hoạt của Crawlee. Nó hoạt động chủ yseues trong bộ nhớ nhưng cung cấp tùy chọn duy trì dữ liệu vào hệ thống tệp cục bộ. MemoryStorage hoạt động như một trình quản lý trung tâm cho tất cả các hoạt động liên quan đến lưu trữ và cung cấp quyền truy cập vào các client chuyên biệt cho *Dataset, KeyValueStore, RequestQueue*. Để đảm bảo tính toàn vẹn dữ liệu và hoạt động hiệu quả đặc biệt là khi duy trì vào đĩa, MemoryStorage sử dụng các tác vụ nền để quản lý tương tác với hệ thống tệp không đồng bộ.

    Để có giải pháp lưu trữ tùy chỉnh:
        * Tạo Custom Storage Client: Viết lớp triển khai *StorageClient* interface. Client này sẽ chịu trách nhiệm giao tiếp với hệ thống tùy chỉnh của mình.
        * Cung cấp Custom Storage Client cho Crawlee:
            * Tại thời điểm khởi tạo **actor**: Khi khởi tạo Actor trong môi trường Apify hoặc cục bộ, truyền instance client lưu trữ tùy chỉnh.
            Ví dụ:
            -   import { Actor } from 'apify';
            -   import { MyCustomStorageClient } from './my-custom-storage-client'; // Client tùy chỉnh của bạn
            -
            -   const myClient = new MyCustomStorageClient(); // Khởi tạo client tùy chỉnh
            -   await Actor.init({ storage: myClient });
            * Sử dụng **Configuration.useStorageClient()**: Có thể đặt client lưu trữ tùy chỉnh của mình làm mặc định cho tất cả các hoạt động lưu trữ thông qua Configuration.useStorageClient().
            -
            Ví dụ:
            -   import { Configuration, RequestQueue, Dataset, KeyValueStore } from 'crawlee';
            -   import { MyCustomStorageClient } from './my-custom-storage-client';
            -
            -   const myClient = new MyCustomStorageClient();
            -   Configuration.useStorageClient(myClient);
            -
            -   // Giờ đây, RequestQueue, Dataset, KeyValueStore sẽ sử dụng MyCustomStorageClient
            -   const requestQueue = await RequestQueue.open('my-queue');
            -   const dataset = await Dataset.open('my-dataset');
            -   const keyValueStore = await KeyValueStore.open('my-kvs');
            -
            * Truyền trực tiếp vào **open()** method: Một số phương thức open() của các storage class (ví dụ: RequestQueue.open(), Dataset.open(), KeyValueStore.open() ) chấp nhận một đối tượng options có thể chứa một storageClient cụ thể. Điều này cho phép chỉ định một client khác cho một storage instance cụ thể mà không ảnh hưởng đến cáu hình toàn cục.
            Ví dụ:
            -   import { RequestQueue, Dataset, KeyValueStore } from 'crawlee';
            -   import { MyCustomStorageClient } from './my-custom-storage-client';
            -
            -    const myClient = new MyCustomStorageClient();
            -
            -    // Chỉ RequestQueue này sẽ sử dụng MyCustomStorageClient
            -    const requestQueue = await RequestQueue.open('my-custom-queue', { storageClient: myClient });

6.  Error Handling and Monitoring
    * Custom Error Classes: Một hệ thống phân cấp các lớp lỗi tùy chỉnh *NonRetryableError, CriticalError, RetryRequestError, SessionError* định rõ phản ứng với các vấn đề khác nhau.
    
    * Error Snapshotter: Lớp *ErrorSnapshotter* chụp ảnh nhanh trang khi xảy ra lỗi, bao gồm chụp ảnh màn hình và nội dung HTML, cung cấp ngữ cảnh quan trọng để gỡ lỗi.

    * Error Tracker: Lớp *ErrorTracker* tổng hợp và tóm tắt các trường hợp lỗi, phân loại các ngoại lệ dựa trên dấu vết ngăn xếp (stracktrace), mã lỗi, tên và thông báo giúp xác định các mẫu lỗi phổ biến. *ErrorTracker* có thể tích hợp với *ErrorSnapshotter* để đưa ra các ảnh chụp chẩn đoán vào các lỗi được báo cáo.

    * Statistics: Lớp *Statistics* thu thập và duy trì các số liệu hoạt động tổng thể, bao gồm số lượng lỗi. Nó sử dụng hai phiên bản *ErrorTracker* để phân biệt giữa các lỗi tamh thời và các lỗi dẫn đến thất bại cuối cùng của yêu cầu.

7. HTTP Client Framework and Utilities
    * BaseHttpClient: Khung cung cấp giao diện **BaseHttpClient** mà các client tùy chỉnh có thể triển khai để đảm bảo khả năng tương thích với các chức năng cốt lõi của Crawlee.
    
    * GotScrapingHttpClient: tích hợp thư viện *got-scraping*, cung cấp các tính năng nâng cao như xoay vòng proxy tự động, thử lại yêu cầu và quản lý cookie toàn diện.
    
    * ImplitHttpClient: Sử dụng thư viện *impit*, có khả năng kiểm soát chi tiết đối với việc theo dõi chuyển hướng, bộ nhớ đệm client và khả năng phát trực tuyến. Quản lý các kết nối TCP liên tục thông qua *LruCache* để tái sử dụng các phiên bản impit và triển khai logic chuyển hướng đệ quy tùy chỉnh.

    * sendRequest: *sendRequest* là một hàm tiện ích có sẵn trong crawling context (crawlingContext.sendRequest) cho phép thực hiện các yêu cầu HTTP. Nó sử dụng httpClient đã cấu hình của crawler.

8. Routing and Crawler Context
    * Router: Lớp **Router** tạo điều kiện thuận lợi cho việc điều phối các yêu cầu đến các trình xử lý cụ thể dựa trên nhãn hoặc các tiêu chí khác. Điều này cho phép tổ chức logic thu thập thông tin theo module, nơi các loại trang URL khác nhau có thể được xử lý bởi các hàm chuyên dụng. **Router** hỗ trợ thêm các trình xử lý cho các nhãn yêu cầu cụ thể, một trình xử lý mặc định cho các yêu cầu không có nhãn và các hàm middleware.

    * CrawlingContext: là một đối tượng được truyền cho các trình xử lý yêu cầu, cung cấp quyền truy cập vào thông tin cụ thể của yêu cầu e.g request, sesion,., các tiện ích e.g enqueueLinks, pushData, sendRequest, useState, getKeyValueStore. và instance crawler. Điều này cho phép logic yêu cầu được thực thi trong một môi trường được đóng gói và phù hợp.

    * Lifecyle Event Management: EvenManager và LocalEvenManager quản lý các sự kiện vòng đời của ứng dụng, duy trì trạng thái theo các khoảng thời gian đều đặn và phát ra thông tin hệ thống.


















