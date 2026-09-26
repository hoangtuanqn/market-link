package com.techx.intervue.modules.conversation.repositories;

import com.techx.intervue.modules.conversation.entities.UserPresence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserPresenceRepository extends JpaRepository<UserPresence, Long> {}
