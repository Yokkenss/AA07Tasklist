CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `profileImage` VARCHAR(191) NULL,
    `role` ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    UNIQUE INDEX `User_email_key` (`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Der Admin wird vor den Fremdschlüsseln angelegt, damit v2-Aufgaben erhalten bleiben.
-- Der Hash gehört zu einem zufälligen Passwort. Der Seed setzt den Admin über den Service.
INSERT INTO `User` (`email`, `password`, `role`)
VALUES ('admin@tasklist.local', '$2b$12$LpqOc33p50g0SuaeLg9OkOhPTPYt9Nau7WH6kUJH0xo0vPmVSy/eK', 'admin');

ALTER TABLE `Task` ADD COLUMN `creatorId` INTEGER NULL,
                   ADD COLUMN `assigneeId` INTEGER NULL;

UPDATE `Task`
SET `creatorId` = (SELECT `id` FROM `User` WHERE `email` = 'admin@tasklist.local');

ALTER TABLE `Task` MODIFY `creatorId` INTEGER NOT NULL,
    ADD INDEX `Task_creatorId_idx` (`creatorId`),
    ADD INDEX `Task_assigneeId_idx` (`assigneeId`),
    ADD CONSTRAINT `Task_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `Task_assigneeId_fkey` FOREIGN KEY (`assigneeId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
