-- Atlas Brief migration 0003: extend augmentation_log to allow OM augment types

alter table augmentation_log
  drop constraint augmentation_log_augment_type_check;

alter table augmentation_log
  add constraint augmentation_log_augment_type_check
  check (augment_type in ('contacts', 'public_record', 'loan', 'om', 'om_create'));
