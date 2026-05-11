from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import ValidationError

from app.core.dependencies import require_roles
from app.schemas.transport import TransportRouteCreate, TransportRouteRead, TransportRouteUpdate
from app.services.transport_service import (
    create_transport_route,
    delete_transport_route,
    get_transport_route,
    get_transport_routes,
    update_transport_route,
)

router = APIRouter()

@router.post("/", response_model=TransportRouteRead, status_code=status.HTTP_201_CREATED)
async def create_transport_route_endpoint(
    route_in: TransportRouteCreate,
    _=Depends(require_roles(["admin", "superadmin"])),
) -> TransportRouteRead:
    return await create_transport_route(route_in)

@router.get("/", response_model=list[TransportRouteRead])
async def list_transport_routes(
    skip: int = 0,
    limit: int = 10000,
    _=Depends(require_roles(["admin", "superadmin", "teacher"])),
) -> list[TransportRouteRead]:
    return await get_transport_routes(skip=skip, limit=limit)

@router.get("/{route_id}", response_model=TransportRouteRead)
async def get_transport_route_endpoint(
    route_id: int,
    _=Depends(require_roles(["admin", "superadmin", "teacher"])),
) -> TransportRouteRead:
    route = await get_transport_route(route_id)
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transport route not found")
    return route

@router.put("/{route_id}", response_model=TransportRouteRead)
async def update_transport_route_endpoint(
    route_id: int,
    route_in: TransportRouteUpdate,
    _=Depends(require_roles(["admin", "superadmin"])),
) -> TransportRouteRead:
    route = await get_transport_route(route_id)
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transport route not found")
    return await update_transport_route(route, route_in)

@router.delete("/{route_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transport_route_endpoint(
    route_id: int,
    _=Depends(require_roles(["admin", "superadmin"])),
) -> None:
    route = await get_transport_route(route_id)
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transport route not found")
    await delete_transport_route(route)
    return None
