# CODEMAP — карта кода index.html

Сгенерировано `node tools/codemap.cjs` (обновляется само при каждом коммите). 5755 строк, 523 функций, 40 разделов. Номера — строки index.html.

Связи: `node tools/codemap.cjs who <функция>` (что вызывает и кто её вызывает), `find <часть имени>`, `section <часть заголовка>`. Читай index.html кусками по номерам строк отсюда, а не целиком.

## Icons (inline SVG via currentColor — replaces emoji so style/color are ours to control) · L743
Данные: ICON_PATHS L744, CATS L794, CAT_MAP L817, CAT_COLORS L819, AVATAR_GRADIENTS L827, KEYWORDS L840, CUR_SYM L858
ico L785, icoInline L790, catColor L821, statsColor L823, avatarGradient L831, personBadge L835

## Firestore-backed storage (replaces IndexedDB; store names/keys mirror the old object stores) · L882
Данные: EXTRA_STORES L884, ALL_STORES L885, STORE_KEY_FIELD L886
docId L887, serverTs L893, stamped L894, tombstone L895, trackWrite L896, commitBatch L902, docRef L903, batchPut L904, batchDel L905, batchGoalInc L907, batchSetting L912, batchXp L917, colCacheDel L926, dbPut L927, dbDel L928, countRead L929, syncKey L930, readSyncMark L931, writeSyncMark L934, dbAll L940, dbAllInner L944, clearSyncMarks L965, checkRemoteReset L967, renderSyncState L975, dbClear L982

## Sync setup (space = your data, addressed by a hash of your access code) · L991
Данные: APPCHECK_SITE_KEY L1001
generateCode L992, sha256Hex L996, ensureAuth L1005, withTimeout L1014, deviceLabel L1015, memberKey L1020, ensureSpaceDoc L1022, ensureMember L1030, ensureMembership L1041, showDevices L1047, revokeDevice L1058, connectSpace L1063, readLegacyIndexedDB L1087, hasAnyLegacyData L1106, downloadLegacyBackup L1107, uploadLegacyData L1112, showCodeModal L1124, copyCode L1133, confirmCodeSaved L1137, showMyCode L1144, createNewSpace L1150, joinExistingSpace L1171, syncNow L1195

## Cache · L1208
getTxs L1209, dirtyTx L1213, txCacheRemove L1214

## Utils · L1216
Данные: W_OPS L1228, ERR_OFFLINE_WRITE L1231, ERR_TEXTS L1232, ERR_OFFLINE_CODES L1249, MONTHS_SHORT_RU L1267, MONTHS_NOM_RU L1268, MONTHS_PREP_RU L1269
fmt L1217, fmtCur L1218, localDate L1219, today L1220, uid L1221, getCat L1222, escapeHtml L1223, plural L1226, nWord L1227, errCode L1250, errText L1251, ymdShift L1270, dateRange L1274, filterPeriod L1287, periodLabel L1289, periodPhrase L1298, dayMonthShort L1306, formatDateShort L1313, fitTextSize L1320, fitText L1327, fitAll L1336, labelPeriodTabs L1338

## Toast · L1340
toast L1341, toastUndo L1347, undoTx L1355, showWarning L1366

## Classifier · L1372
Данные: CAT_TYPE L1384, MCC_MAP L1390, PERSON_NAME_RE L1411
parseInput L1373, parseAmt L1382, classifyByMCC L1403, classify L1413, learnCategory L1430

## Solutions to defer to Pro version · L1440
tickFit L1444, refreshDashboard L1449, setPeriod L1471

## Smart Input · L1473
setType L1474, handleSmartInput L1483, showFallbackGrid L1501, selectFallbackCat L1517, saveFallback L1523, currentBank L1535, setCurrentBank L1536, renderCmdBanks L1541, saveTx L1545

## Templates · L1555
renderTemplates L1556, useTmpl L1567, openTmplModal L1577, closeTmplModal L1582, saveTemplate L1584

## Budget · L1596
checkBudget L1597

## History · L1615
historyFilteredTxs L1616, setHistorySearch L1622, refreshHistory L1623, setHistoryPeriod L1641, setHistoryBank L1648, renderHistoryCalendar L1649, shiftHistoryCalMonth L1672, selectHistoryDay L1679, exportHistoryFiltered L1683, deleteTx L1691

## Stats · L1693
Данные: TOOLTIP_STYLE L1779
refreshStats L1694, buildRing L1742, ringHot L1759, sphereShow L1760, sphereReset L1765, sphereToggle L1771, renderCharts L1780, setStatsPeriod L1797, setStatsMonth L1803

## Plans · L1810
Данные: PLAN_SEGS L1812
showPlanSeg L1813, switchSubTab L1820, showAddPlanForm L1825, refreshPlans L1831, planRing L1839, renderHomeBudgetRing L1843, refreshBudgets L1857, saveBudget L1874, delBudget L1883, registerGoalCategories L1887, contributeToGoal L1894, goalRollback L1898, refreshGoals L1903, saveGoal L1916, addToGoal L1923, deleteGoal L1929

## Statement · L1931
Данные: BANK_NAMES L2025, CSV_HEAD_RE L2498
loadStatement L1933, loadCsvStatement L1940, loadPdfStatement L1962, detectBank L1998, parseKaspiPdf L2027, parseFortePdf L2076, parseHalykPdf L2133, parseFreedomPdf L2222, missRow L2292, setStmtCat L2300, confirmNotDuplicateStatement L2309, extractBalanceKaspiForte L2322, extractBalanceHalyk L2333, extractBalanceFreedom L2340, extractStatementBalance L2357, renderBalanceBanner L2363, applyDetectedBalance L2371, stmtKey L2381, buildTxIndex L2382, takeMatch L2391, matchStatementRows L2394, showPdfResults L2412, parseStmtAmount L2437, stmtValidYmd L2453, parseStmtDate L2456, parseCsvRows L2471, detectCsvDelimiter L2488, csvCellIsData L2499, findCsvHeaderRow L2502, parseCsvTable L2514, countFffd L2523, looksMisdecoded L2524, decodeCsvBuffer L2526, guessCsvColumns L2536, stmtTypeFromCell L2546, stmtRowEntries L2557, analyzeStatement L2570, toggleAllStmt L2607, undoStmtImport L2616, addSelectedStmt L2631

## Settings · L2672
getSetting L2674, saveSetting L2680

## Bank balances · L2685
Данные: BANK_KEYS L2686
bankBalance L2689, setBankBalance L2698, statementPeriodEnd L2705, bankTotals L2713, renderBankBalances L2717, openBankEdit L2746, toggleBankEdit L2751, saveBankBalances L2757, setCurrency L2769

## Backups: snapshots in Firestore (F3.4), external copy + CSV (F3.5), restore «заменить» (F3.6) · L2771
Данные: BACKUP_STORES L2773, BACKUP_KEEP L2774, BACKUP_LABELS L2887
backupKeyField L2776, plainValue L2778, cleanBackupData L2787, backupCounts L2797, buildBackupV2 L2798, parseBackup L2802, stableStr L2817, diffBackup L2825, chunkList L2847, bytesToB64 L2848, b64ToBytes L2849, pipeBytes L2850, encodeSnapshot L2852, decodeSnapshot L2857, splitB64 L2861, dayRu L2862, dayDiff L2863, ruDays L2864, reminderFor L2865, snapshotDue L2869, csvCell L2871, buildTxCsv L2877, lsGet L2888, lsSet L2889, backupReminderText L2890, backupsCol L2891, snapKey L2892, readImportedStatements L2893, collectBackupData L2898, makeSnapshot L2907, createSnapshot L2908, pruneSnapshots L2924, loadSnapshot L2932, maybeAutoBackup L2944, manualSnapshot L2963, snapSummary L2972, showSnapshots L2976, renderBackupSettings L2988, isAppleTouch L2998, deliverFile L3001, sharePendingFile L3015, markExternalBackup L3023, exportData L3025, exportCsv L3032, reloadAfterBulkChange L3039, importData L3049, readRestoreJob L3064, writeRestoreJob L3065, clearRestoreJob L3066, restoreStash L3068, restorePanel L3082, setRestoreProgress L3083, restoreFromFile L3084, restoreFromSnapshot L3090, startRestore L3097, renderRestorePlan L3112, cancelRestore L3134, restoreOpToBatch L3140, applyRestore L3149, resumeRestore L3188, clearAll L3195

## F6.6 first run · F6.7 bottom sheet · F6.9 launch shortcuts · L3209
Данные: STARTER_PACK L3213, COUNT_FORMS L3266, LAUNCH_VIEWS L3278, FIRST_RUN_STEPS L3298, NATIVE_CONFIRM L3322
starterPackDocs L3251, countsText L3268, importSummary L3272, launchIntent L3279, sheetMessage L3286, sheetNextFocus L3288, firstRunStateFrom L3290, firstRunChecklistHtml L3305, sheetNative L3324, sheetConfirm L3328, sheetPrompt L3333, sheetQueue L3339, sheetEl L3344, sheetOpen L3345, firstRunKey L3397, starterPackPending L3399, installStarterPack L3404, offerStarterPack L3418, firstRunStateSync L3436, firstRunChecklistState L3442, firstRunHide L3449, firstRunAct L3450

## Tasks & habits: data and logic · L3461
Данные: LISTS L3462
listName L3463, dirtyTasks L3465, getCol L3468, dirtyCols L3473, colPut L3474, colDel L3479, getTasks L3484, getHabits L3485, getChecks L3486, getTaskLog L3487, cachePut L3488, pad2 L3491, parseLocalDate L3492, addDays L3493, isoWeekday L3494, nextOccurrence L3497, nextDue L3518, completeTask L3522, completeTaskInner L3528, toastUndoTask L3549, undoTask L3556, habitStreak L3572, toggleHabit L3579, toggleHabitInner L3584, setHabitSphere L3601, addHabit L3607, archiveHabit L3614, formatTaskDate L3622

## Tasks screen · L3628
Данные: QUICK_LISTS L3772, QUICK_WEEKDAYS L3773
refreshTasks L3630, cmpTasks L3634, upcomingEvents L3638, taskRowHtml L3650, taskTap L3665, openSalaryAllocation L3673, taskEditHtml L3674, renderTasks L3696, toggleTasksLater L3733, toggleHabitsEdit L3734, editTask L3735, taskRepeatChanged L3736, saveTaskEdit L3741, deleteTask L3764, parseQuickDate L3774, parseQuickTask L3791, addQuickTask L3805

## Game layer: XP, levels, ranks, cooling, seasons, achievements · L3816
Данные: SPHERES L3817, SPHERE_OF_LIST L3818, COOL_DAYS L3868, SEASONS L3909, ACHIEVEMENTS L3918
xpToNext L3819, cumXp L3820, levelOf L3821, levelInfo L3822, rankOf L3823, nextRankAt L3824, daysBetween L3825, weekStart L3826, xpTotals L3828, levelsNow L3833, refreshStatusIfVisible L3837, notifyLevelChange L3838, awardXp L3845, revokeXp L3855, coolWindow L3869, sphereActivityDates L3870, sphereIdleDays L3875, coolingInfo L3880, returnBonusActive L3890, xpWithBonus L3898, runCooling L3902, coolingWarnings L3906, seasonNow L3915, getAchievements L3932, checkAchievements L3935

## Journal & command line ([+]) · L3969
Данные: TAG_SPHERE L3970
sphereColor L3971, hhmm L3972, extractJournal L3973, addJournal L3978, deleteJournal L3985, renderJournalToday L3989, createTask L3995

## F6 pure helpers: [+] dates and no-amount hint, task actions, status tiles, salary (tests/status_cmd.cjs) · L4003
Данные: MONTHS_SHORT L4004, CMD_TASK_VERB L4046
isYmdValid L4005, cmdDateValue L4011, cmdDatePick L4017, cmdDateLabel L4023, cmdFixAmountToken L4030, cmdHasKeyword L4036, cmdNoAmountHint L4052, cmdEnterAction L4065, isSalaryTask L4071, taskActionKind L4073, taskTapAction L4075, workoutOpenDecision L4081, statusTileTarget L4090, allocBudgetQuestion L4092, findRecordedSalary L4097, refreshActive L4104, openCmd L4110, closeCmd L4125, cmdSetType L4131, cmdCurDate L4138, renderCmdDates L4139, cmdSetDate L4144, cmdSyncRows L4152, cmdParse L4159, cmdChipHtml L4179, cmdUpdate L4188, cmdKey L4196, cmdSubmit L4201, cmdApplyHint L4211, cmdSaveHintAsTask L4216, cmdEditPart L4221, cmdShowCats L4230, cmdFlipType L4244, cmdPickCat L4250, cmdSave L4260, cmdSaveInner L4265

## Module 3: installments (рассрочки) · L4285
fmtNum L4286, nextPayDate L4287, debtLastPayment L4288, refreshDebts L4293, toggleDebtForm L4294, renderDebts L4295, saveDebt L4326, deleteDebt L4336

## Module 4: salary allocation · L4377
getAllocScheme L4378, refreshAlloc L4380, renderAlloc L4386, allocSave L4408, allocSetLife L4409, allocAdd L4410, allocSet L4411, allocMove L4412, allocDel L4413, allocPlan L4415, allocPreview L4429, allocConfirm L4444

## Module 5: workouts and body weight · L4475
Данные: WK_MAX_KG L4478, EXTRA_EXERCISES L4550
wcol L4477, isKg L4479, isRep L4480, fmtKg L4481, wkAllSets L4482, wkDate L4483, parseKg L4485, parseRepsVal L4492, wkClean L4500, wkFirstOpen L4504, lastDoneEntry L4506, lastWeightedEntry L4513, suggestWeight L4515, workoutSummary L4523, staleWorkout L4534, refreshBody L4538, planById L4543, pendingWorkoutTask L4545, exerciseCatalog L4559, installTrainingProgram L4565, newPlan L4576, editPlan L4577, closePlanEdit L4578, planEditField L4579, planEditName L4585, planEditRemove L4586, planEditMove L4587, openExPicker L4588, pickCatalogExercise L4590, pickCustomExercise L4594, addExerciseTo L4599, savePlanEdit L4613, deletePlan L4622, exPickerHtml L4628, planEditorHtml L4635, startWorkout L4658, resumeWorkout L4664, dropWorkout L4668, openWorkoutTask L4674, wkSave L4685, wkInputIdx L4687, setWeight L4688, setReps L4697, wkHint L4708, wkCaption L4712, wkListHtml L4717, wkPaint L4721, pickExercise L4727, finishWorkout L4728, closeWorkoutSummary L4742, cancelWorkout L4743, saveBodyWeight L4747, sparkline L4753, wkSummaryHtml L4760, wkStaleHtml L4767

## Body 2.0 · B1: muscle map · L4775
Данные: MUSCLES L4777, EXERCISE_MUSCLES L4784, MUSCLE_WORDS L4805, CALF_NECK_WORDS L4806, WEEKLY_SETS_TARGET L4850, BODY_SHAPES L4854, MIRROR_SKIP L4869
exerciseMuscles L4807, muscleLoad L4816, muscleRecovery L4831, muscleVerdict L4851, bodyPolys L4870

## Body 2.0 · B2: skill tree («Путь») · L4878
Данные: MAJOR_MUSCLES L4881, SKILL_TREES L4882, BODY_GOAL_KG L4907
avgBodyWeight L4908, bestStreak L4912, liftBest L4918, repsBest L4922, volumeWeeks L4926, evaluateSkillTree L4936, skillData L4965, checkSkills L4971, selectSkill L4985, renderSkillPath L4986, setBodySeg L5011, bodySegHtml L5012, bodyFigureSvg L5015, renderBodyMap L5022, selectMuscle L5055, renderBody L5057

## Shell: navigation, money sub-tabs, quest tabs · L5102
Данные: MONEY_VIEWS L5104, MONEY_LABELS L5105, MONEY_CHILD L5106, PLAN_ALIAS L5107
navKeyOf L5109, reducedMotion L5113, fxViewTransition L5114, moveLamp L5118, switchView L5125, closeSettings L5155, buildMoneyTabs L5156, updateMoneyTabs L5167, setQuestTab L5169, moveQInd L5177, showAchievementPlaque L5182

## Status screen (hero, bento, daily quest) · L5187
Данные: MONTHS_GEN L5191, WD_SHORT L5192
xpLogSync L5188, xpTotalsSync L5189, coolingSync L5190, dayWord L5193, refreshStatus L5196, statusSummary L5202, renderStatus L5208, openSphere L5263, playStatusIntro L5273, setAvatar L5282, resetAvatar L5295

## Quests → Season · L5297
Данные: ACH_ICON L5298
renderSeason L5299

## Quests → Week · L5318
weekShift L5320, renderWeek L5321, copyWeek L5365

## F3.3 Data integrity check: pure part (tests/integrity.cjs loads it from here up to the UI marker) · L5371
Данные: INTEGRITY_CLASSES L5372, XP_KNOWN_PREFIXES L5373
isYmd L5374, checkInvariants L5382

## F3.3 Data integrity check: UI · L5580
Данные: INTEGRITY_SEV L5582
integrityLoad L5583, runIntegrityCheck L5589, renderIntegrity L5598, integrityFixText L5613, integrityBeforeFix L5627, integrityDelTasks L5635, integrityApply L5639, integrityFix L5661, integrityFixClass L5672

## Init · L5704
startApp L5705, init L5734

## fx.js (эффекты)
fxRM L11, fxScramble L18, fxTicker L35, fxFlash L52, fxQuestDone L59, fxFly L82, fxDraw L91, fxMarquee L123, fxLevelUp L135, fxAchievement L192, fxBoot L199
