const Exercise = require("../../models/exercise.model");
const Lesson = require("../../models/lesson.model");
const paginationHelper = require("../../helpers/pagination");
const systemConfig = require("../../config/system");
const createTreeHelper = require("../../helpers/createTree");

// [DELETE] /admin/exercise/delete/:ExerciseID
module.exports.deleteItem = async (req, res) => {
  const exerID = req.params.ExerciseID;

  await Lesson.updateOne(
    { _id: exerID },
    {
      ExerciseDeleted: 0,
      deletedBy: {
        UserId: res.locals.user.id,
        deletedAt: new Date(),
      },
    }
  );
  res.json({
    code: 200,
    message: "Xoá thành công!"
  })
};


// [POST] /admin/exercise/edit/:LessonID
module.exports.editPost = async (req, res) => {
  try {
    const exercise = await Exercise.findOne({
      LessonId: req.params.LessonID
    })
    if (exercise) {
      const { editedBy, ...updateFields } = req.body.exercise;
      const newEditedBy = {
        UserId: res.locals.user.id,
        editedAt: new Date(),
      };
      console.log(updateFields);
      await Exercise.updateOne(
        { LessonId: req.params.LessonID },
        {
          ...updateFields,
          $push: { editedBy: newEditedBy },
        }
      );
    } else {
      console.log(req.body)
      const exer = new Exercise({
        ...req.body.exercise,
        "createdBy.UserId": res.locals.user.id
      })
      await exer.save()
    }
    res.json({
      code: 200,
      message: "Cập nhật thành công!"
    })
  } catch (error) {
    console.log(error)
    res.json({
      code: 400,
      message: "Cập nhật thất bại!"
    })
  }
};

// [GET] /admin/exercise/detail/:LessonID
module.exports.detailItem = async (req, res) => {
  try {
    console.log(req.params.LessonID)
    const find = {
      ExerciseDeleted: 1,
      LessonId: req.params.LessonID,
    };

    const exer = await Exercise.findOne(find);
    console.log(exer)
    const lesson = await Lesson.findOne({
      _id: req.params.LessonID,
      LessonDeleted: 1,
    }).lean();
    lesson.exercise = exer ? exer : {
      LessonId: req.params.LessonID,
      ExerciseName: "",
      ExerciseQuestion: "",
      ExerciseSample: "",
      ExerciseAnswer: "",
    };
    res.json(lesson)

  } catch (error) {
    res.json({
      code: 400,
      message: error
    })
  }
};
