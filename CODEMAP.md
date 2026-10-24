# CODEMAP — карта кода index.html

Сгенерировано `node tools/codemap.cjs` (обновляется само при каждом коммите). 5756 строк, 523 функций, 40 разделов. Номера — строки index.html.

Связи: `node tools/codemap.cjs who <функция>` (что вызывает и кто её вызывает), `find <часть имени>`, `section <часть заголовка>`. Читай index.html кусками по номерам строк отсюда, а не целиком.

## Icons (inline SVG via currentColor — replaces emoji so style/color are ours to control) · L743
Данные: ICON_PATHS L744, CATS L795, CAT_MAP L818, CAT_COLORS L820, AVATAR_GRADIENTS L828, KEYWORDS L841, CUR_SYM L859
ico L786, icoInline L791, catColor L822, statsColor L824, avatarGradient L832, personBadge L836

## Firestore-backed storage (replaces IndexedDB; store names/keys mirror the old object stores) · L883
Данные: EXTRA_STORES L885, ALL_STORES L886, STORE_KEY_FIELD L887
docId L888, serverTs L894, stamped L895, tombstone L896, trackWrite L897, commitBatch L903, docRef L904, batchPut L905, batchDel L906, batchGoalInc L908, batchSetting L913, batchXp L918, colCacheDel L927, dbPut L928, dbDel L929, countRead L930, syncKey L931, readSyncMark L932, writeSyncMark L935, dbAll L941, dbAllInner L945, clearSyncMarks L966, checkRemoteReset L968, renderSyncState L976, dbClear L983

## Sync setup (space = your data, addressed by a hash of your access code) · L992
Данные: APPCHECK_SITE_KEY L1002
generateCode L993, sha256Hex L997, ensureAuth L1006, withTimeout L1015, deviceLabel L1016, memberKey L1021, ensureSpaceDoc L1023, ensureMember L1031, ensureMembership L1042, showDevices L1048, revokeDevice L1059, connectSpace L1064, readLegacyIndexedDB L1088, hasAnyLegacyData L1107, downloadLegacyBackup L1108, uploadLegacyData L1113, showCodeModal L1125, copyCode L1134, confirmCodeSaved L1138, showMyCode L1145, createNewSpace L1151, joinExistingSpace L1172, syncNow L1196

## Cache · L1209
getTxs L1210, dirtyTx L1214, txCacheRemove L1215

## Utils · L1217
Данные: W_OPS L1229, ERR_OFFLINE_WRITE L1232, ERR_TEXTS L1233, ERR_OFFLINE_CODES L1250, MONTHS_SHORT_RU L1268, MONTHS_NOM_RU L1269, MONTHS_PREP_RU L1270
fmt L1218, fmtCur L1219, localDate L1220, today L1221, uid L1222, getCat L1223, escapeHtml L1224, plural L1227, nWord L1228, errCode L1251, errText L1252, ymdShift L1271, dateRange L1275, filterPeriod L1288, periodLabel L1290, periodPhrase L1299, dayMonthShort L1307, formatDateShort L1314, fitTextSize L1321, fitText L1328, fitAll L1337, labelPeriodTabs L1339

## Toast · L1341
toast L1342, toastUndo L1348, undoTx L1356, showWarning L1367

## Classifier · L1373
Данные: CAT_TYPE L1385, MCC_MAP L1391, PERSON_NAME_RE L1412
parseInput L1374, parseAmt L1383, classifyByMCC L1404, classify L1414, learnCategory L1431

## Solutions to defer to Pro version · L1441
tickFit L1445, refreshDashboard L1450, setPeriod L1472

## Smart Input · L1474
setType L1475, handleSmartInput L1484, showFallbackGrid L1502, selectFallbackCat L1518, saveFallback L1524, currentBank L1536, setCurrentBank L1537, renderCmdBanks L1542, saveTx L1546

## Templates · L1556
renderTemplates L1557, useTmpl L1568, openTmplModal L1578, closeTmplModal L1583, saveTemplate L1585

## Budget · L1597
checkBudget L1598

## History · L1616
historyFilteredTxs L1617, setHistorySearch L1623, refreshHistory L1624, setHistoryPeriod L1642, setHistoryBank L1649, renderHistoryCalendar L1650, shiftHistoryCalMonth L1673, selectHistoryDay L1680, exportHistoryFiltered L1684, deleteTx L1692

## Stats · L1694
Данные: TOOLTIP_STYLE L1780
refreshStats L1695, buildRing L1743, ringHot L1760, sphereShow L1761, sphereReset L1766, sphereToggle L1772, renderCharts L1781, setStatsPeriod L1798, setStatsMonth L1804

## Plans · L1811
Данные: PLAN_SEGS L1813
showPlanSeg L1814, switchSubTab L1821, showAddPlanForm L1826, refreshPlans L1832, planRing L1840, renderHomeBudgetRing L1844, refreshBudgets L1858, saveBudget L1875, delBudget L1884, registerGoalCategories L1888, contributeToGoal L1895, goalRollback L1899, refreshGoals L1904, saveGoal L1917, addToGoal L1924, deleteGoal L1930

## Statement · L1932
Данные: BANK_NAMES L2026, CSV_HEAD_RE L2499
loadStatement L1934, loadCsvStatement L1941, loadPdfStatement L1963, detectBank L1999, parseKaspiPdf L2028, parseFortePdf L2077, parseHalykPdf L2134, parseFreedomPdf L2223, missRow L2293, setStmtCat L2301, confirmNotDuplicateStatement L2310, extractBalanceKaspiForte L2323, extractBalanceHalyk L2334, extractBalanceFreedom L2341, extractStatementBalance L2358, renderBalanceBanner L2364, applyDetectedBalance L2372, stmtKey L2382, buildTxIndex L2383, takeMatch L2392, matchStatementRows L2395, showPdfResults L2413, parseStmtAmount L2438, stmtValidYmd L2454, parseStmtDate L2457, parseCsvRows L2472, detectCsvDelimiter L2489, csvCellIsData L2500, findCsvHeaderRow L2503, parseCsvTable L2515, countFffd L2524, looksMisdecoded L2525, decodeCsvBuffer L2527, guessCsvColumns L2537, stmtTypeFromCell L2547, stmtRowEntries L2558, analyzeStatement L2571, toggleAllStmt L2608, undoStmtImport L2617, addSelectedStmt L2632

## Settings · L2673
getSetting L2675, saveSetting L2681

## Bank balances · L2686
Данные: BANK_KEYS L2687
bankBalance L2690, setBankBalance L2699, statementPeriodEnd L2706, bankTotals L2714, renderBankBalances L2718, openBankEdit L2747, toggleBankEdit L2752, saveBankBalances L2758, setCurrency L2770

## Backups: snapshots in Firestore (F3.4), external copy + CSV (F3.5), restore «заменить» (F3.6) · L2772
Данные: BACKUP_STORES L2774, BACKUP_KEEP L2775, BACKUP_LABELS L2888
backupKeyField L2777, plainValue L2779, cleanBackupData L2788, backupCounts L2798, buildBackupV2 L2799, parseBackup L2803, stableStr L2818, diffBackup L2826, chunkList L2848, bytesToB64 L2849, b64ToBytes L2850, pipeBytes L2851, encodeSnapshot L2853, decodeSnapshot L2858, splitB64 L2862, dayRu L2863, dayDiff L2864, ruDays L2865, reminderFor L2866, snapshotDue L2870, csvCell L2872, buildTxCsv L2878, lsGet L2889, lsSet L2890, backupReminderText L2891, backupsCol L2892, snapKey L2893, readImportedStatements L2894, collectBackupData L2899, makeSnapshot L2908, createSnapshot L2909, pruneSnapshots L2925, loadSnapshot L2933, maybeAutoBackup L2945, manualSnapshot L2964, snapSummary L2973, showSnapshots L2977, renderBackupSettings L2989, isAppleTouch L2999, deliverFile L3002, sharePendingFile L3016, markExternalBackup L3024, exportData L3026, exportCsv L3033, reloadAfterBulkChange L3040, importData L3050, readRestoreJob L3065, writeRestoreJob L3066, clearRestoreJob L3067, restoreStash L3069, restorePanel L3083, setRestoreProgress L3084, restoreFromFile L3085, restoreFromSnapshot L3091, startRestore L3098, renderRestorePlan L3113, cancelRestore L3135, restoreOpToBatch L3141, applyRestore L3150, resumeRestore L3189, clearAll L3196

## F6.6 first run · F6.7 bottom sheet · F6.9 launch shortcuts · L3210
Данные: STARTER_PACK L3214, COUNT_FORMS L3267, LAUNCH_VIEWS L3279, FIRST_RUN_STEPS L3299, NATIVE_CONFIRM L3323
starterPackDocs L3252, countsText L3269, importSummary L3273, launchIntent L3280, sheetMessage L3287, sheetNextFocus L3289, firstRunStateFrom L3291, firstRunChecklistHtml L3306, sheetNative L3325, sheetConfirm L3329, sheetPrompt L3334, sheetQueue L3340, sheetEl L3345, sheetOpen L3346, firstRunKey L3398, starterPackPending L3400, installStarterPack L3405, offerStarterPack L3419, firstRunStateSync L3437, firstRunChecklistState L3443, firstRunHide L3450, firstRunAct L3451

## Tasks & habits: data and logic · L3462
Данные: LISTS L3463
listName L3464, dirtyTasks L3466, getCol L3469, dirtyCols L3474, colPut L3475, colDel L3480, getTasks L3485, getHabits L3486, getChecks L3487, getTaskLog L3488, cachePut L3489, pad2 L3492, parseLocalDate L3493, addDays L3494, isoWeekday L3495, nextOccurrence L3498, nextDue L3519, completeTask L3523, completeTaskInner L3529, toastUndoTask L3550, undoTask L3557, habitStreak L3573, toggleHabit L3580, toggleHabitInner L3585, setHabitSphere L3602, addHabit L3608, archiveHabit L3615, formatTaskDate L3623

## Tasks screen · L3629
Данные: QUICK_LISTS L3773, QUICK_WEEKDAYS L3774
refreshTasks L3631, cmpTasks L3635, upcomingEvents L3639, taskRowHtml L3651, taskTap L3666, openSalaryAllocation L3674, taskEditHtml L3675, renderTasks L3697, toggleTasksLater L3734, toggleHabitsEdit L3735, editTask L3736, taskRepeatChanged L3737, saveTaskEdit L3742, deleteTask L3765, parseQuickDate L3775, parseQuickTask L3792, addQuickTask L3806

## Game layer: XP, levels, ranks, cooling, seasons, achievements · L3817
Данные: SPHERES L3818, SPHERE_OF_LIST L3819, COOL_DAYS L3869, SEASONS L3910, ACHIEVEMENTS L3919
xpToNext L3820, cumXp L3821, levelOf L3822, levelInfo L3823, rankOf L3824, nextRankAt L3825, daysBetween L3826, weekStart L3827, xpTotals L3829, levelsNow L3834, refreshStatusIfVisible L3838, notifyLevelChange L3839, awardXp L3846, revokeXp L3856, coolWindow L3870, sphereActivityDates L3871, sphereIdleDays L3876, coolingInfo L3881, returnBonusActive L3891, xpWithBonus L3899, runCooling L3903, coolingWarnings L3907, seasonNow L3916, getAchievements L3933, checkAchievements L3936

## Journal & command line ([+]) · L3970
Данные: TAG_SPHERE L3971
sphereColor L3972, hhmm L3973, extractJournal L3974, addJournal L3979, deleteJournal L3986, renderJournalToday L3990, createTask L3996

## F6 pure helpers: [+] dates and no-amount hint, task actions, status tiles, salary (tests/status_cmd.cjs) · L4004
Данные: MONTHS_SHORT L4005, CMD_TASK_VERB L4047
isYmdValid L4006, cmdDateValue L4012, cmdDatePick L4018, cmdDateLabel L4024, cmdFixAmountToken L4031, cmdHasKeyword L4037, cmdNoAmountHint L4053, cmdEnterAction L4066, isSalaryTask L4072, taskActionKind L4074, taskTapAction L4076, workoutOpenDecision L4082, statusTileTarget L4091, allocBudgetQuestion L4093, findRecordedSalary L4098, refreshActive L4105, openCmd L4111, closeCmd L4126, cmdSetType L4132, cmdCurDate L4139, renderCmdDates L4140, cmdSetDate L4145, cmdSyncRows L4153, cmdParse L4160, cmdChipHtml L4180, cmdUpdate L4189, cmdKey L4197, cmdSubmit L4202, cmdApplyHint L4212, cmdSaveHintAsTask L4217, cmdEditPart L4222, cmdShowCats L4231, cmdFlipType L4245, cmdPickCat L4251, cmdSave L4261, cmdSaveInner L4266

## Module 3: installments (рассрочки) · L4286
fmtNum L4287, nextPayDate L4288, debtLastPayment L4289, refreshDebts L4294, toggleDebtForm L4295, renderDebts L4296, saveDebt L4327, deleteDebt L4337

## Module 4: salary allocation · L4378
getAllocScheme L4379, refreshAlloc L4381, renderAlloc L4387, allocSave L4409, allocSetLife L4410, allocAdd L4411, allocSet L4412, allocMove L4413, allocDel L4414, allocPlan L4416, allocPreview L4430, allocConfirm L4445

## Module 5: workouts and body weight · L4476
Данные: WK_MAX_KG L4479, EXTRA_EXERCISES L4551
wcol L4478, isKg L4480, isRep L4481, fmtKg L4482, wkAllSets L4483, wkDate L4484, parseKg L4486, parseRepsVal L4493, wkClean L4501, wkFirstOpen L4505, lastDoneEntry L4507, lastWeightedEntry L4514, suggestWeight L4516, workoutSummary L4524, staleWorkout L4535, refreshBody L4539, planById L4544, pendingWorkoutTask L4546, exerciseCatalog L4560, installTrainingProgram L4566, newPlan L4577, editPlan L4578, closePlanEdit L4579, planEditField L4580, planEditName L4586, planEditRemove L4587, planEditMove L4588, openExPicker L4589, pickCatalogExercise L4591, pickCustomExercise L4595, addExerciseTo L4600, savePlanEdit L4614, deletePlan L4623, exPickerHtml L4629, planEditorHtml L4636, startWorkout L4659, resumeWorkout L4665, dropWorkout L4669, openWorkoutTask L4675, wkSave L4686, wkInputIdx L4688, setWeight L4689, setReps L4698, wkHint L4709, wkCaption L4713, wkListHtml L4718, wkPaint L4722, pickExercise L4728, finishWorkout L4729, closeWorkoutSummary L4743, cancelWorkout L4744, saveBodyWeight L4748, sparkline L4754, wkSummaryHtml L4761, wkStaleHtml L4768

## Body 2.0 · B1: muscle map · L4776
Данные: MUSCLES L4778, EXERCISE_MUSCLES L4785, MUSCLE_WORDS L4806, CALF_NECK_WORDS L4807, WEEKLY_SETS_TARGET L4851, BODY_SHAPES L4855, MIRROR_SKIP L4870
exerciseMuscles L4808, muscleLoad L4817, muscleRecovery L4832, muscleVerdict L4852, bodyPolys L4871

## Body 2.0 · B2: skill tree («Путь») · L4879
Данные: MAJOR_MUSCLES L4882, SKILL_TREES L4883, BODY_GOAL_KG L4908
avgBodyWeight L4909, bestStreak L4913, liftBest L4919, repsBest L4923, volumeWeeks L4927, evaluateSkillTree L4937, skillData L4966, checkSkills L4972, selectSkill L4986, renderSkillPath L4987, setBodySeg L5012, bodySegHtml L5013, bodyFigureSvg L5016, renderBodyMap L5023, selectMuscle L5056, renderBody L5058

## Shell: navigation, money sub-tabs, quest tabs · L5103
Данные: MONEY_VIEWS L5105, MONEY_LABELS L5106, MONEY_CHILD L5107, PLAN_ALIAS L5108
navKeyOf L5110, reducedMotion L5114, fxViewTransition L5115, moveLamp L5119, switchView L5126, closeSettings L5156, buildMoneyTabs L5157, updateMoneyTabs L5168, setQuestTab L5170, moveQInd L5178, showAchievementPlaque L5183

## Status screen (hero, bento, daily quest) · L5188
Данные: MONTHS_GEN L5192, WD_SHORT L5193
xpLogSync L5189, xpTotalsSync L5190, coolingSync L5191, dayWord L5194, refreshStatus L5197, statusSummary L5203, renderStatus L5209, openSphere L5264, playStatusIntro L5274, setAvatar L5283, resetAvatar L5296

## Quests → Season · L5298
Данные: ACH_ICON L5299
renderSeason L5300

## Quests → Week · L5319
weekShift L5321, renderWeek L5322, copyWeek L5366

## F3.3 Data integrity check: pure part (tests/integrity.cjs loads it from here up to the UI marker) · L5372
Данные: INTEGRITY_CLASSES L5373, XP_KNOWN_PREFIXES L5374
isYmd L5375, checkInvariants L5383

## F3.3 Data integrity check: UI · L5581
Данные: INTEGRITY_SEV L5583
integrityLoad L5584, runIntegrityCheck L5590, renderIntegrity L5599, integrityFixText L5614, integrityBeforeFix L5628, integrityDelTasks L5636, integrityApply L5640, integrityFix L5662, integrityFixClass L5673

## Init · L5705
startApp L5706, init L5735

## fx.js (эффекты)
fxRM L11, fxScramble L18, fxTicker L35, fxFlash L52, fxQuestDone L59, fxFly L82, fxDraw L91, fxMarquee L123, fxLevelUp L135, fxAchievement L192, fxBoot L199
