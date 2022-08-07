const dayjs = require('dayjs');
const _ = require('lodash');
const convertSnakeToCamel = require('../lib/convertSnakeToCamel');

const addUser = async (client, email, username, socialId) => {
  const now = dayjs().add(9, 'hour');
  const { rows } = await client.query(
    `
    INSERT INTO "user"
    (email, username, social_id, created_at, updated_at)
    VALUES
    ($1, $2, $3, $4, $4)
    RETURNING id, username, email, social_id, created_at, updated_at
    `,
    [email, username, socialId, now],
  );
  return convertSnakeToCamel.keysToCamel(rows[0]);
};

const findUserById = async (client, userId) => {
  const { rows } = await client.query(
    `
    SELECT * FROM "user"
    WHERE id = $1
    
    `,
    [userId],
  );
  return convertSnakeToCamel.keysToCamel(rows);
};

const findUserBySocialId = async (client, socialId) => {
  const { rows } = await client.query(
    `
    SELECT * FROM "user"
    WHERE social_id = $1
    
    `,
    [socialId],
  );
  return convertSnakeToCamel.keysToCamel(rows[0]);
};

const findUserByEmail = async (client, email) => {
  const { rows } = await client.query(
    `
    SELECT * FROM "user"
    WHERE email = $1
    
    `,
    [email],
  );
  return convertSnakeToCamel.keysToCamel(rows[0]);
};

const setUserToken = async (client, user, accessToken) => {
  const now = dayjs().add(9, 'hour');
  const { rows: existingRows } = await client.query(
    `
    SELECT * FROM "user"
    WHERE id = $1
    
    `,
    [user.id],
  );

  if (existingRows.length === 0) return false;

  const data = _.merge({}, convertSnakeToCamel.keysToCamel(existingRows[0]), { accessToken });

  const { rows } = await client.query(
    `
    UPDATE "user" 
    SET access_token = $1, updated_at = $3
    WHERE id = $2
    RETURNING * 
    `,
    [data.accessToken, user.id, now],
  );
  return convertSnakeToCamel.keysToCamel(rows[0]);
};

const findUserByName = async (client, username) => {
  const { rows } = await client.query(
    `
    SELECT id as member_id, username as member_name
    FROM "user"
    WHERE username = $1

    `,
    [username],
  );
  return convertSnakeToCamel.keysToCamel(rows);
};

const findUserNameById = async (client, userId) => {
  const { rows } = await client.query(
    `
    SELECT username FROM "user"
    WHERE id = $1
    `,
    [userId],
  );
  return convertSnakeToCamel.keysToCamel(rows);
};

const findDeviceTokenById = async (client, userId) => {
  try {
    const { rows } = await client.query(
      `
      SELECT device_token
      FROM "user"
      WHERE id = $1
      `,
      [userId],
    );
    return convertSnakeToCamel.keysToCamel(rows[0]);
  } catch (error) {
    throw new Error('userDB.findDeviceTokenById에서 오류 발생: ' + error);
  }
};

const updateUserNameById = async (client, userId, username) => {
  try {
    const { rows } = await client.query(
      `
      UPDATE "user"
      SET username = $1
      WHERE id = $2
      `,
      [username, userId],
    );

    return convertSnakeToCamel.keysToCamel(rows);
  } catch (error) {
    throw new Error('userDB.updateUserNameById에서 오류 발생: ' + error);
  }
};

const findPillById = async (client, userId) => {
  try {
    const { rows } = await client.query(
      `
      SELECT p.id, p.color, p.pill_name
      FROM "user" as u JOIN pill p on u.id = p.user_id
      WHERE u.id = $1 AND p.is_stop = false;
      `,
      [userId],
    );
    return convertSnakeToCamel.keysToCamel(rows);
  } catch (error) {
    throw new Error('userDB.findPillById에서 오류 발생: ' + error);
  }
};

module.exports = {
  addUser,
  findUserById,
  findUserBySocialId,
  findUserByEmail,
  setUserToken,
  findUserByName,
  findUserNameById,
  findDeviceTokenById,
  updateUserNameById,
  findPillById,
};
