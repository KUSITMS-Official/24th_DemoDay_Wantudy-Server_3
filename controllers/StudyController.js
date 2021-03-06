const mongoose = require("mongoose");
const StudyList = require('../models/StudyModel');
const LikeStudy = require('../models/LikeStudy');
const commentList = require('../models/comment');
const recommentList = require('../models/recomment')
const reportList = require('../models/reportModel');
const User = require('../models/User')
const path = require('path');
const logger = require('../.config/winston');

//스터디 개설 페이지 보여주기
exports.createStudy = function (req, res) {
    res.sendFile(path.join(__dirname, '../../build/index.html'))
}

//StudyList에 document 저장
exports.saveStudy = async function (req, res) {
    const { userId, studyName, category, description, onoff,
        studyTime, peopleNum, requiredInfo, deadline, period, level } = req.body;
    logger.info("userId : " + req.body.userId)
    logger.info("onoff : " + req.body.onoff)
    logger.info("requiredInfo : " + req.body.requiredInfo)
    logger.info("deadline : " + req.body.deadline)
    logger.info("period : " + req.body.period)
    logger.info("level : " + req.body.level)

    const user=await User.findOne({ userId : userId })
    const nickname = user.nickname

    const study = new StudyList({
        userId,
        nickname,
        studyName,
        category,
        description,
        onoff,
        studyTime,
        peopleNum,
        requiredInfo,
        deadline,
        period,
        level
    })
    if (req.body.deadline !== null) {
        study.deadline = new Date(req.body.deadline);
    }
    try {
        await study.save();
        return res
            .status(200)
            .json(study);
    } catch (err) {
        logger.error("스터디저장 error : " + err)
        throw res.status(500).json({ error: err })
    }
};

//스터디 리스트 페이지 조회 ( 한 페이지 당 5개씩 )
//마감기한 임박순 디폴트
exports.showStudy = async function (req, res) {
    try {
        const studypost = await StudyList.find()
        return res
            .status(200)
            .json(studypost);
    } catch (err) {
        logger.error("스터디 조회 error : " + err)
        throw res
            .status(500)
            .json({ error: err })
    }
}

//스터디 상세 페이지 조회
exports.detailStudy = async function (req, res) {
    const { studyId } = req.params;
    try {
        const study = await StudyList.findOne({ StudyId: studyId })
        const comment = await commentList.find({ studyId: studyId })
        const recomment = await recommentList.find({ studyId: studyId })
        const writer = await User.findOne({userId: study.userId})

        if (!study) {
            return res.status(404).end();
        } else {
            return res.status(200).json({
                status: 'succes',
                data: study, comment, recomment, writer
            })
        }
    } catch (err) {
        logger.error("상세페이지 조회 error " + err)
        throw res
            .status(500)
            .json({ error: err });
    }
}

//스터디 검색하기
exports.searchStudy = async function (req, res) {
    let options = [];
    try {
        if (req.query.option == 'studyName') {
            options = [{ studyName: new RegExp(req.query.content) }];
        }
        else {
            const err = new Error('검색 옵션이 없습니다.');
            err.status = 400;
            throw err;
        }
        const studypost = await StudyList.find({ $or: options })
       
        return res
            .status(200)
            .json(studypost);
    } catch (err) {
        logger.error("스터디 검색 err : " + err)
        throw res.status(500).json({ error: err })
    }
}

//게시글 삭제
exports.deleteStudy = async function (req, res) {
    const { studyId } = req.params;
    try {
        await StudyList.findOneAndDelete({ StudyId: studyId })
        //댓글도 삭제
        await commentList.findOneAndDelete({ StudyId: studyId })
        await recommentList.findOneAndDelete({ StudyId: studyId })
        return res.status(204).json();
    } catch (err) {
        throw res.status(500).json({ error: err })
    }
}

//게시글 수정
exports.updateStudy = async function (req, res) {
    const { studyId } = req.params;

    try {
        const study = await StudyList.findOneAndUpdate({ StudyId: studyId },
            {
                $set: {
                    studyName: req.body.studyName,
                    category: req.body.category,
                    description: req.body.description,
                    onoff: req.body.onoff,
                    studyTime: req.body.studyTime,
                    peopleNum: req.body.peopleNum,
                    requiredInfo: req.body.requiredInfo,
                    deadline: req.body.deadline,
                    satrt: req.body.start,
                    end: req.body.end
                },
                updated: Date.now()
            },
            { new: true })
            .exec();
        if (!study) {
            return res.status(404)
        }
        return res
            .status(200)
            .json(study);
    } catch (err) {
        logger.error("스터디 수정 err: " + err)
        throw res.status(500).json({ error: err })
    }
};

//스크랩 
exports.likeStudy = async function (req, res) {
    const { studyId } = req.params;
    const { userId } = req.body;

    try {
        const study = await StudyList.findOne({ StudyId: studyId }); // 스터디 찾아오기
        const check = await LikeStudy.find({ userId: userId, study: study._id });
        if (!study) {
            return res.status(404).end();
        }
        else if (check.length != 0) {
            return res.send('이미 찜한 스터디입니다.').end();
        }
        else {
            const like = new LikeStudy({
                userId: userId,
                study: study
            });

            await like.save();
            await StudyList.findOneAndUpdate({ StudyId: studyId },
                {
                    $inc: {
                        likeNum: 1
                    }
                })
            return res
                .status(200)
                .json(like)
        }
    } catch (err) {
        logger.error("스터디 스크랩 err: " + err)
        throw res
            .status(500)
            .json({ error: err });
    }
}

//스크랩 취소

exports.deleteLike = async (req, res) => {
    const { studyId } = req.params;
    const { userId } = req.body;

    try {
        const study = await StudyList.findOne({ StudyId: studyId }); // 스터디 찾아오기
        const like = await LikeStudy.find({ userId: userId, study: study._id });
        logger.info("study._id" + study._id)
        logger.info("like[0]._id" + like[0]._id)
        if (!study) {
            return res.status(404).end();
        }
        else if (like) {
            await LikeStudy.findByIdAndDelete(like[0]._id)
            await StudyList.findOneAndUpdate({ StudyId: studyId },
                {
                    $inc: { likeNum: -1 }
                })
            return res.status(204).json({ msg: '스크랩 취소' });
        }
    } catch (err) {
        logger.error("스터디 스크랩 취소 err: " + err)
        throw res
            .status(500)
            .json({ error: err });
    }
}


//스터디 신고
exports.saveReport = async (req, res) => {
    const { studyId } = req.params;
    const { reason } = req.body;

    try {
        const check = await reportList.findOne({ studyId: studyId }).exec();
        if (check) {
            const reportupdate = await reportList.findOneAndUpdate({ studyId: studyId },
                {
                    $push: {
                        reason: req.body.reason
                    },//신고 사유 누적
                },
                { new: true })
                .exec();
            return res
                .status(200)
                .json(reportupdate)
        }
        else {
            const report = new reportList({
                studyId,
                reason
            })
            await report.save();
            return res
                .status(200)
                .json(report);
        }
    } catch (err) {
        logger.error("신고 사유 저장 error : " + err)
        throw res.status(500).json({ error: err })
    }
};
