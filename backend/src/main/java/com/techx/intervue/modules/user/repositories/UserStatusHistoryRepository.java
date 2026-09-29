package com.techx.intervue.modules.user.repositories;

import com.techx.intervue.modules.user.entities.UserStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserStatusHistoryRepository extends JpaRepository<UserStatusHistory, Long> {}
