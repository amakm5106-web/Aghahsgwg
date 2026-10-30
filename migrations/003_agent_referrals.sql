CREATE TABLE IF NOT EXISTS azlottery_user_roles (
  user_id BIGINT UNSIGNED NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_azlottery_user_roles_user FOREIGN KEY (user_id)
    REFERENCES azlottery_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS azlottery_referral_profiles (
  user_id BIGINT UNSIGNED NOT NULL,
  referral_code VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  referred_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_azlottery_referral_code (referral_code),
  KEY ix_azlottery_referral_parent (referred_by_user_id, created_at),
  CONSTRAINT fk_azlottery_referral_profile_user FOREIGN KEY (user_id)
    REFERENCES azlottery_users (id) ON DELETE CASCADE,
  CONSTRAINT fk_azlottery_referral_profile_parent FOREIGN KEY (referred_by_user_id)
    REFERENCES azlottery_users (id) ON DELETE SET NULL,
  CONSTRAINT chk_azlottery_referral_not_self CHECK (referred_by_user_id IS NULL OR referred_by_user_id <> user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS azlottery_referral_activities (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  referrer_user_id BIGINT UNSIGNED NOT NULL,
  referred_user_id BIGINT UNSIGNED NOT NULL,
  tier TINYINT UNSIGNED NOT NULL,
  activity_type ENUM('registration', 'deposit', 'game') NOT NULL,
  commission_mmk DECIMAL(18, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_azlottery_ref_activity_agent_time (referrer_user_id, created_at),
  KEY ix_azlottery_ref_activity_member (referred_user_id, tier),
  CONSTRAINT fk_azlottery_ref_activity_agent FOREIGN KEY (referrer_user_id)
    REFERENCES azlottery_users (id) ON DELETE CASCADE,
  CONSTRAINT fk_azlottery_ref_activity_member FOREIGN KEY (referred_user_id)
    REFERENCES azlottery_users (id) ON DELETE CASCADE,
  CONSTRAINT chk_azlottery_ref_activity_tier CHECK (tier BETWEEN 1 AND 6),
  CONSTRAINT chk_azlottery_ref_activity_commission CHECK (commission_mmk >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
