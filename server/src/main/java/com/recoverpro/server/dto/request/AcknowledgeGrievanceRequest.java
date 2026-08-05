package com.recoverpro.server.dto.request;

import lombok.Data;

/** No fields yet -- acknowledge is a pure receipt confirmation (stops the ack-SLA clock).
 * Assignment happens at the investigate step. */
@Data
public class AcknowledgeGrievanceRequest {
}
