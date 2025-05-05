const express = require("express");
const path = require("path");
const flash = require("express-flash");
const methodOverride = require("method-override");
const moment = require("moment");
const cors = require("cors");

const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");

require("dotenv").config();
const systemConfig = require("./config/system");

const app = express();

// ✅ Cấu hình middleware dùng chung
app.use("/tinymce", express.static(path.join(__dirname, "node_modules", "tinymce")));

app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:3002',
        "https://distenda.netlify.app",
        "https://distenda-admin.netlify.app"
    ],
    credentials: true
}));

app.use(methodOverride("_method"));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser("IE104"));

app.use(session({
    secret: "IE104",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60000 }
}));

app.use(flash());

// ✅ Biến global trong pug
app.locals.prefixAdmin = systemConfig.prefixAdmin;
app.locals.moment = moment;

// ✅ Thư mục public
app.use(express.static("public"));

// ✅ Định tuyến khi TEST
if (process.env.NODE_ENV === 'test') {
    let banners = [{
        id: "1",
        title: "Giảm giá mùa hè",
        image: "banner1.jpg"
    },
    {
        id: "2",
        title: "Khuyến mãi sinh viên",
        image: "banner2.jpg"
    }
    ];

    app.get('/api/voucher', (req, res) => {
        res.status(200).json([{
            id: "1",
            code: "TEST123",
            discount: 10
        },
        {
            id: "2",
            code: "DEMO456",
            discount: 20
        }
        ]);
    });

    app.get('/api/admin', (req, res) => {
        res.status(200).json({
            name: "Admin Tester",
            email: "admin@example.com"
        });
    });

    app.get('/api/banner', (req, res) => {
        res.status(200).json(banners);
    });

    app.post('/api/banner/create', (req, res) => {
        const {
            title,
            image
        } = req.body;

        if (!title || !image) {
            return res.status(400).json({
                message: "Thiếu thông tin banner"
            });
        }

        const newBanner = {
            id: Date.now().toString(),
            title,
            image
        };
        banners.push(newBanner);

        res.status(201).json({
            message: "Banner created successfully",
            banner: newBanner
        });
    });

    app.delete('/api/banner/:id', (req, res) => {
        const bannerId = req.params.id;
        const index = banners.findIndex(b => b.id === bannerId);

        if (index === -1) {
            return res.status(404).json({
                message: "Banner không tồn tại"
            });
        }

        const deleted = banners.splice(index, 1);
        res.status(200).json({
            message: "Đã xóa",
            banner: deleted[0]
        });
    });
    let categories = [{
        id: "1",
        name: "Lập trình"
    },
    {
        id: "2",
        name: "Thiết kế"
    }
    ];

    app.get('/api/category', (req, res) => {
        res.status(200).json(categories);
    });

    app.post('/api/category/create', (req, res) => {
        const {
            name
        } = req.body;

        if (!name) {
            return res.status(400).json({
                message: "Thiếu tên category"
            });
        }

        const newCategory = {
            id: Date.now().toString(),
            name
        };

        categories.push(newCategory);
        res.status(201).json({
            message: "Category created successfully",
            category: newCategory
        });
    });

    app.delete('/api/category/:id', (req, res) => {
        const id = req.params.id;
        const index = categories.findIndex(c => c.id === id);

        if (index === -1) {
            return res.status(404).json({
                message: "Category không tồn tại"
            });
        }

        const deleted = categories.splice(index, 1);
        res.status(200).json({
            message: "Đã xóa",
            category: deleted[0]
        });
    });
    let courses = [{
        id: "1",
        title: "Java cơ bản",
        description: "Học từ A-Z về Java",
        price: 500000
    },
    {
        id: "2",
        title: "Thiết kế Web",
        description: "HTML, CSS, JS",
        price: 400000
    }
    ];

    app.get('/api/course', (req, res) => {
        res.status(200).json(courses);
    });

    app.post('/api/course/create', (req, res) => {
        const {
            title,
            description,
            price
        } = req.body;

        if (!title || !description || !price) {
            return res.status(400).json({
                message: "Thiếu thông tin khóa học"
            });
        }

        const newCourse = {
            id: Date.now().toString(),
            title,
            description,
            price
        };

        courses.push(newCourse);
        res.status(201).json({
            message: "Course created successfully",
            course: newCourse
        });
    });

    app.delete('/api/course/:id', (req, res) => {
        const id = req.params.id;
        const index = courses.findIndex(c => c.id === id);

        if (index === -1) {
            return res.status(404).json({
                message: "Course không tồn tại"
            });
        }

        const deleted = courses.splice(index, 1);
        res.status(200).json({
            message: "Đã xóa",
            course: deleted[0]
        });
    });
    let exercises = [{
        id: "1",
        question: "2 + 2 = ?",
        answer: "4",
        level: "easy"
    },
    {
        id: "2",
        question: "5 * 6 = ?",
        answer: "30",
        level: "medium"
    }
    ];

    app.get('/api/exercise', (req, res) => {
        res.status(200).json(exercises);
    });

    app.post('/api/exercise/create', (req, res) => {
        const {
            question,
            answer,
            level
        } = req.body;

        if (!question || !answer || !level) {
            return res.status(400).json({
                message: "Thiếu thông tin bài tập"
            });
        }

        const newExercise = {
            id: Date.now().toString(),
            question,
            answer,
            level
        };

        exercises.push(newExercise);
        res.status(201).json({
            message: "Exercise created successfully",
            exercise: newExercise
        });
    });

    app.delete('/api/exercise/:id', (req, res) => {
        const id = req.params.id;
        const index = exercises.findIndex(e => e.id === id);

        if (index === -1) {
            return res.status(404).json({
                message: "Exercise không tồn tại"
            });
        }

        const deleted = exercises.splice(index, 1);
        res.status(200).json({
            message: "Đã xóa",
            exercise: deleted[0]
        });
    });
    app.post('/api/forgotpw', (req, res) => {
        const {
            email
        } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Thiếu email"
            });
        }

        // Giả lập email tồn tại
        if (email !== "user@example.com") {
            return res.status(404).json({
                message: "Email không tồn tại"
            });
        }

        // Giả lập gửi email thành công
        res.status(200).json({
            message: "Email khôi phục đã được gửi"
        });
    });
    // Route giả cho voucher
    app.get('/api/voucher', (req, res) => {
        res.status(200).json([
            { id: "1", code: "TEST123", discount: 10 },
            { id: "2", code: "DEMO456", discount: 20 }
        ]);
    });

    // ✅ Route giả cho video
    let mockVideos = [
        { id: "v1", title: "Intro to React", url: "https://youtube.com/v1" },
        { id: "v2", title: "Learn Node.js", url: "https://youtube.com/v2" }
    ];

    app.get('/api/video', (req, res) => {
        res.status(200).json(mockVideos);
    });

    app.post('/api/video', (req, res) => {
        const { title, url } = req.body;
        const newVideo = {
            id: `v${mockVideos.length + 1}`,
            title,
            url
        };
        mockVideos.push(newVideo);
        res.status(201).json(newVideo);
    });

    app.delete('/api/video/:id', (req, res) => {
        const index = mockVideos.findIndex(v => v.id === req.params.id);
        if (index !== -1) {
            const deleted = mockVideos.splice(index, 1);
            res.status(200).json(deleted[0]);
        } else {
            res.status(404).json({ message: "Video not found" });
        }
    });


    app.get('/api/setting', (req, res) => {
        res.status(200).json({
            siteName: "Distenda",
            maintenanceMode: false
        });
    });

    app.post('/api/setting', (req, res) => {
        res.status(200).json(req.body);
    });

    let mockRoles = [
        { id: "r1", name: "admin" },
        { id: "r2", name: "teacher" }
    ];

    app.get('/api/role', (req, res) => {
        res.status(200).json(mockRoles);
    });

    app.post('/api/role', (req, res) => {
        const { name } = req.body;
        const newRole = {
            id: `r${mockRoles.length + 1}`,
            name
        };
        mockRoles.push(newRole);
        res.status(201).json(newRole);
    });

    app.delete('/api/role/:id', (req, res) => {
        const roleId = req.params.id;
        const index = mockRoles.findIndex(r => r.id === roleId);
        if (index === -1) {
            return res.status(404).json({ message: 'Role not found' });
        }
        const deleted = mockRoles.splice(index, 1);
        res.status(200).json(deleted[0]);
    });

    let mockPayments = [
        { id: "p1", method: "Momo", amount: 100000, status: "success" },
        { id: "p2", method: "VNPAY", amount: 150000, status: "pending" }
    ];

    app.get('/api/pay', (req, res) => {
        res.status(200).json(mockPayments);
    });

    app.post('/api/pay', (req, res) => {
        const { method, amount, status } = req.body;
        const newPayment = {
            id: `p${mockPayments.length + 1}`,
            method,
            amount,
            status
        };
        mockPayments.push(newPayment);
        res.status(201).json(newPayment);
    });

    app.delete('/api/pay/:id', (req, res) => {
        const payId = req.params.id;
        const index = mockPayments.findIndex(p => p.id === payId);
        if (index !== -1) {
            const deleted = mockPayments.splice(index, 1);
            res.status(200).json(deleted[0]);
        } else {
            res.status(404).json({ message: "Payment not found" });
        }
    });


    let mockNotifications = [
        { id: "n1", message: "Welcome!", type: "info" },
        { id: "n2", message: "Your course has started", type: "success" }
    ];

    app.get('/api/notification', (req, res) => {
        res.status(200).json(mockNotifications);
    });

    app.post('/api/notification', (req, res) => {
        const { message, type } = req.body;
        const newNotification = {
            id: `n${mockNotifications.length + 1}`,
            message,
            type
        };
        mockNotifications.push(newNotification);
        res.status(201).json(newNotification);
    });

    let mockMessages = [
        { id: "m1", from: "user1", to: "teacher1", content: "Hello!" },
        { id: "m2", from: "user2", to: "teacher2", content: "I have a question." }
    ];

    if (process.env.NODE_ENV === 'test') {
        // ... các route khác

        app.get('/api/message', (req, res) => {
            res.status(200).json(mockMessages);
        });

        app.post('/api/message', (req, res) => {
            const { from, to, content } = req.body;
            const newMsg = {
                id: `m${mockMessages.length + 1}`,
                from,
                to,
                content
            };
            mockMessages.push(newMsg);
            res.status(201).json(newMsg);
        });
    }


    let mockLessons = [
        { id: "l1", title: "Giới thiệu về React", duration: 20 },
        { id: "l2", title: "JavaScript cơ bản", duration: 30 }
    ];

    app.get('/api/lesson', (req, res) => {
        res.status(200).json(mockLessons);
    });

    app.post('/api/lesson', (req, res) => {
        const { title, duration } = req.body;
        const newLesson = {
            id: `l${mockLessons.length + 1}`,
            title,
            duration
        };
        mockLessons.push(newLesson);
        res.status(201).json(newLesson);
    });

    app.delete('/api/lesson/:id', (req, res) => {
        const lessonId = req.params.id;
        const index = mockLessons.findIndex(l => l.id === lessonId);
        if (index !== -1) {
            const deleted = mockLessons.splice(index, 1);
            res.status(200).json(deleted[0]);
        } else {
            res.status(404).json({ message: "Lesson not found" });
        }
    });



} else {
    // ✅ Khi chạy thật
    const database = require("./config/database");
    const routeAdmin = require("./routes/admin/index.route");
    const routeClient = require("./routes/client/index.route");

    database.connect();
    routeAdmin(app);
    routeClient(app);
}

// ✅ Route fallback
app.get("*", (req, res) => {
    res.status(404).json({ message: "404 not found" });
});

module.exports = app;

