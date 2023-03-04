const { pillService } = require('../service');

const util = require('../lib/util');
const statusCode = require('../constants/statusCode');
const responseMessage = require('../constants/responseMessage');
const returnType = require('../constants/returnType');
const { functions } = require('lodash');
const slackAPI = require('../middlewares/slackAPI');

/**
 *  @약_추가
 *  @route POST /pill
 *  @access private
 *  @err 1. 유저 인증과정에 문제가 생긴 경우
 *       2. request body에 해당 값이 없는 경우
 *       3. 약 이름이 10자가 초과되는 경우
 *       4. 약이 5개가 초과되는 경우
 *       5. 해당 유저가 존재하지 않을 경우
 *       6. 서버 에러
 */

const addPill = async (req, res) => {
  try {
    const { user } = req.header;
    const { pillName, day, timeList, start, end } = req.body;

    // err 1.
    if (!user) {
      return res
        .status(statusCode.FORBIDDEN)
        .json(util.fail(statusCode.FORBIDDEN, responseMessage.NO_AUTHENTICATED));
    }

    // err 2.
    if (!pillName || !day || !timeList || !start || !end) {
      return res
        .status(statusCode.BAD_REQUEST)
        .json(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
    }

    // err 3.
    pillName.forEach((name) => {
      if (name.length > 10 || name.length === 0) {
        return res
          .status(statusCode.BAD_REQUEST)
          .json(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_PILL_NAME));
      }
    });

    // 약 추가 서비스
    const newPill = await pillService.addPill(pillName, user.id, day, timeList, start, end);

    // err 4.
    if (newPill === returnType.PILL_COUNT_OVER) {
      return res
        .status(statusCode.BAD_REQUEST)
        .json(util.fail(statusCode.BAD_REQUEST, responseMessage.PILL_COUNT_OVER));
    }

    // err 5.
    if (newPill === returnType.NON_EXISTENT_USER) {
      return res
        .status(statusCode.NOT_FOUND)
        .json(util.fail(statusCode.NOT_FOUND, responseMessage.NO_USER));
    }

    return res.status(newPill.status).json(newPill);
  } catch (error) {
    console.log('addPill Controller 에러: ' + error);
    return res
      .status(statusCode.INTERNAL_SERVER_ERROR)
      .json(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  }
};

/**
 * POST ~/pill/:memberId
 * 약 전송하기
 * @private
 */
const addMemberPill = async (req, res) => {
  try {
    const { user } = req.header;
    const { memberId } = req.params;
    const { pillName, takeInterval, day, specific, time, start, end } = req.body;

    // 유저 정보가 헤더에 없는 경우
    if (!user) {
      return res
        .status(statusCode.FORBIDDEN)
        .json(util.fail(statusCode.FORBIDDEN, responseMessage.NO_AUTHENTICATED));
    }

    // 필요한 값이 없는 경우
    if (!pillName || !takeInterval || !time || !start || !end) {
      return res
        .status(statusCode.BAD_REQUEST)
        .json(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
    }

    // 약 추가 서비스
    const newPill = await pillService.addMemberPill(
      pillName,
      user.id,
      memberId,
      takeInterval,
      day,
      specific,
      time,
      start,
      end,
    );
    if (newPill === returnType.NO_MEMBER) {
      return res
        .status(statusCode.FORBIDDEN)
        .json(util.fail(statusCode.FORBIDDEN, responseMessage.NO_MEMBER));
    }

    if (newPill === returnType.PILL_COUNT_OVER) {
      return res
        .status(statusCode.BAD_REQUEST)
        .json(util.fail(statusCode.BAD_REQUEST, responseMessage.PILL_COUNT_OVER));
    }

    if (newPill === returnType.DB_NOT_FOUND) {
      return res
        .status(statusCode.DB_ERROR)
        .json(util.fail(statusCode.DB_ERROR, responseMessage.DB_ERROR));
    }

    return res.status(newPill.status).json(newPill);
  } catch (error) {
    console.log('addMemberPill Controller 에러: ' + error);
    return res
      .status(statusCode.INTERNAL_SERVER_ERROR)
      .json(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  }
};

/**
 * GET ~/pill/count
 * 약 추가 가능한 개수 조회
 * @private
 */
const getPillCount = async (req, res) => {
  try {
    const { user } = req.header;

    const pillCount = await pillService.getPillCount(user.id);
    if (pillCount === returnType.NON_EXISTENT_USER)
      return res
        .status(statusCode.BAD_REQUEST)
        .json(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_USER));

    return res.status(pillCount.status).json(pillCount);
  } catch (error) {
    console.log('getPillCount Controller 에러: ' + error);
    return res
      .status(statusCode.INTERNAL_SERVER_ERROR)
      .json(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  }
};

/**
 * GET ~/pill/:memberId/count
 * 멤버 약 추가 가능한 개수 조회
 * @private
 */
const getMemberPillCount = async (req, res) => {
  try {
    const { memberId } = req.params;

    const pillCount = await pillService.getPillCount(memberId);
    if (pillCount === returnType.NON_EXISTENT_USER)
      return res
        .status(statusCode.BAD_REQUEST)
        .json(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_USER));

    return res.status(pillCount.status).json(pillCount);
  } catch (error) {
    console.log('getMemberPillCount Controller 에러: ' + error);
    return res
      .status(statusCode.INTERNAL_SERVER_ERROR)
      .json(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  }
};

/**
 * PUT ~/pill/:pillId
 * 해당 약 일정 수정
 * @private
 */
const pillScheduleModify = async (req, res) => {
  try {
    const { user } = req.header;
    const { pillId } = req.params;
    const { start, end, cycle, day, specific, time, pillName, date } = req.body;

    if (!user || !pillId) {
      return res
        .status(statusCode.BAD_REQUEST)
        .json(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));
    }

    const pillModify = await pillService.pillInfoModify(
      user.id,
      pillId,
      pillName,
      start,
      end,
      cycle,
      day,
      specific,
      time,
      date,
    );

    if (!pillName || !time || !date)
      return res
        .status(statusCode.BAD_REQUEST)
        .json(util.fail(statusCode.BAD_REQUEST, responseMessage.NULL_VALUE));

    if (pillModify === returnType.NON_EXISTENT_USER) {
      return res
        .status(statusCode.UNAUTHORIZED)
        .json(util.fail(statusCode.UNAUTHORIZED, responseMessage.NO_USER));
    }

    if (pillModify === returnType.NON_EXISTENT_PILL) {
      return res
        .status(statusCode.UNAUTHORIZED)
        .json(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_PILL));
    }

    if (pillModify === returnType.NO_PILL_USER) {
      return res
        .status(statusCode.FORBIDDEN)
        .json(util.fail(statusCode.FORBIDDEN, responseMessage.PILL_UNAUTHORIZED));
    }

    return res.status(pillModify.status).json(pillModify);
  } catch (error) {
    functions.logger.error(
      `[ERROR] [${req.method.toUpperCase()}] ${req.originalUrl}`,
      `[CONTENT] ${error}`,
    );
    console.log(error);

    const slackMessage = `[ERROR] [${req.method.toUpperCase()}] ${req.originalUrl} ${
      req.header.user ? `uid:${req.header.user.id}` : 'req.user 없음'
    } ${JSON.stringify(error)}`;
    slackAPI.sendMessageToSlack(slackMessage, slackAPI.DEV_WEB_HOOK_ERROR_MONITORING);

    res
      .status(statusCode.INTERNAL_SERVER_ERROR)
      .send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  }
};

/**
 *  @약_삭제
 *  @route POST /pill/:pillId
 *  @access private
 *  @err 1. 유저 인증과정에 문제가 생긴 경우
 *       2. 해당 유저가 존재하지 않을 경우
 *       3. 해당 약에 접근 권한이 없는 경우
 *       4. 서버 에러
 */

const deletePill = async (req, res) => {
  try {
    const { user } = req.header;
    const { pillId } = req.params;

    // err 1.
    if (!user) {
      return res
        .status(statusCode.UNAUTHORIZED)
        .json(util.fail(statusCode.UNAUTHORIZED, responseMessage.NO_AUTHENTICATED));
    }

    const deletePill = await pillService.deletePill(user.id, Number(pillId));

    // err 2.
    if (deletePill === returnType.NON_EXISTENT_USER) {
      return res
        .status(statusCode.UNAUTHORIZED)
        .json(util.fail(statusCode.UNAUTHORIZED, responseMessage.NO_USER));
    }

    // err 3.
    if (deletePill === returnType.NO_PILL_USER) {
      return res
        .status(statusCode.UNAUTHORIZED)
        .json(util.fail(statusCode.UNAUTHORIZED, responseMessage.PILL_UNAUTHORIZED));
    }

    return res.status(deletePill.status).json(deletePill);
  } catch (error) {
    functions.logger.error(
      `[ERROR] [${req.method.toUpperCase()}] ${req.originalUrl}`,
      `[CONTENT] ${error}`,
    );
    console.log(error);

    const slackMessage = `[ERROR] [${req.method.toUpperCase()}] ${req.originalUrl} ${
      req.header.user ? `uid:${req.header.user.id}` : 'req.user 없음'
    } ${JSON.stringify(error)}`;
    slackAPI.sendMessageToSlack(slackMessage, slackAPI.DEV_WEB_HOOK_ERROR_MONITORING);

    res
      .status(statusCode.INTERNAL_SERVER_ERROR)
      .send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  }
};

/**
 *  @약_중단
 *  @route POST /pill/stop/:pillId
 *  @access private
 *  @err 1. 유저 인증과정에 문제가 생긴 경우
 *       2. 해당 유저가 존재하지 않을 경우
 *       3. 해당 약이 없는 경우
 *       4. 해당 약에 접근 권한이 없는 경우
 *       5. 이미 중단된 약일 경우
 *       6. 서버 에러
 */

const stopPill = async (req, res) => {
  try {
    const { user } = req.header;
    const { pillId } = req.params;

    // err 1.
    if (!user) {
      return res
        .status(statusCode.UNAUTHORIZED)
        .json(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_AUTHENTICATED));
    }

    const stopPill = await pillService.stopPill(user.id, pillId);

    // err 2.
    if (stopPill === returnType.NON_EXISTENT_USER) {
      return res
        .status(statusCode.UNAUTHORIZED)
        .json(util.fail(statusCode.UNAUTHORIZED, responseMessage.NO_USER));
    }

    // err 3.
    if (stopPill === returnType.NON_EXISTENT_PILL) {
      return res
        .status(statusCode.UNAUTHORIZED)
        .json(util.fail(statusCode.BAD_REQUEST, responseMessage.NO_PILL));
    }

    // err 4.
    if (stopPill === returnType.NO_PILL_USER) {
      return res
        .status(statusCode.UNAUTHORIZED)
        .json(util.fail(statusCode.UNAUTHORIZED, responseMessage.PILL_UNAUTHORIZED));
    }

    // err 5.
    if (stopPill === returnType.ALREADY_STOP_PILL) {
      return res
        .status(statusCode.BAD_REQUEST)
        .json(util.fail(statusCode.BAD_REQUEST, responseMessage.ALREADY_PILL_STOP));
    }

    return res.status(stopPill.status).json(stopPill);
  } catch (error) {
    functions.logger.error(
      `[ERROR] [${req.method.toUpperCase()}] ${req.originalUrl}`,
      `[CONTENT] ${error}`,
    );
    console.log(error);

    const slackMessage = `[ERROR] [${req.method.toUpperCase()}] ${req.originalUrl} ${
      req.header.user ? `uid:${req.header.user.id}` : 'req.user 없음'
    } ${JSON.stringify(error)}`;
    slackAPI.sendMessageToSlack(slackMessage, slackAPI.DEV_WEB_HOOK_ERROR_MONITORING);

    res
      .status(statusCode.INTERNAL_SERVER_ERROR)
      .send(util.fail(statusCode.INTERNAL_SERVER_ERROR, responseMessage.INTERNAL_SERVER_ERROR));
  }
};

module.exports = {
  addPill,
  addMemberPill,
  getPillCount,
  getMemberPillCount,
  pillScheduleModify,
  deletePill,
  stopPill,
};
