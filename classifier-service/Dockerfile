FROM public.ecr.aws/lambda/python:3.13

COPY requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements.txt

COPY classifier_v2.py ${LAMBDA_TASK_ROOT}/
COPY classify_aggregator.py ${LAMBDA_TASK_ROOT}/
COPY build_snapshots.py ${LAMBDA_TASK_ROOT}/
COPY handler.py ${LAMBDA_TASK_ROOT}/
COPY duty_stations.json ${LAMBDA_TASK_ROOT}/

CMD ["handler.lambda_handler"]
